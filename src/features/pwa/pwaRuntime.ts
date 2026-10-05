export type PwaStatus = 'development' | 'unsupported' | 'registering' | 'ready' | 'error'
export type PwaState = {
  online: boolean
  installed: boolean
  installAvailable: boolean
  offlineReady: boolean
  updateAvailable: boolean
  updating: boolean
  checking: boolean
  status: PwaStatus
  error: string | null
}

type InstallPrompt = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaEnvironment = {
  production: boolean
  secureContext: boolean
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>
  serviceWorker?: ServiceWorkerContainer
  online(): boolean
  standalone(): boolean
  reload(): void
  setTimeout(callback: () => void, milliseconds: number): number
  clearTimeout(timer: number): void
}

export function createPwaRuntime(environment: PwaEnvironment) {
  let state: PwaState = {
    online: environment.online(), installed: environment.standalone(), installAvailable: false,
    offlineReady: false, updateAvailable: false, updating: false, checking: false,
    status: environment.production ? 'registering' : 'development', error: null,
  }
  const listeners = new Set<() => void>()
  let registration: ServiceWorkerRegistration | null = null
  let prompt: InstallPrompt | null = null
  let started: Promise<void> | null = null
  let reloadRequested = false
  let reloaded = false
  let updateTimeout: number | undefined

  function update(changes: Partial<PwaState>) {
    state = { ...state, ...changes }
    listeners.forEach(listener => listener())
  }

  function reportRegistration() {
    if (!registration) return
    update({
      offlineReady: Boolean(registration.active || registration.waiting),
      updateAvailable: Boolean(registration.waiting),
      status: registration.active || registration.waiting ? 'ready' : 'registering',
    })
  }

  function watchInstalling() {
    const worker = registration?.installing
    if (!worker) return
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'activated') {
        // Installation completes only after the entire app shell was cached.
        reportRegistration()
        update({ offlineReady: true, status: 'ready' })
      } else if (worker.state === 'redundant') {
        update({ error: '离线资源准备失败。你可以继续使用应用，联网后再检查更新。' })
      }
    })
  }

  async function startOnce() {
    environment.window.addEventListener('offline', () => update({ online: false }))
    environment.window.addEventListener('online', () => update({ online: true, error: null }))
    environment.window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault()
      prompt = event as InstallPrompt
      update({ installAvailable: true })
    })
    environment.window.addEventListener('appinstalled', () => {
      prompt = null
      update({ installed: true, installAvailable: false })
    })
    if (!environment.production) return
    if (!environment.secureContext || !environment.serviceWorker) {
      update({ status: 'unsupported' })
      return
    }
    environment.serviceWorker.addEventListener('controllerchange', () => {
      // A refresh requires this tab's explicit action, including in multiple tabs.
      if (reloadRequested && !reloaded) {
        reloaded = true
        if (updateTimeout !== undefined) environment.clearTimeout(updateTimeout)
        environment.reload()
      } else {
        reportRegistration()
      }
    })
    try {
      registration = await environment.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      reportRegistration()
      watchInstalling()
      registration.addEventListener('updatefound', watchInstalling)
    } catch {
      update({ status: 'error', error: '当前浏览器未能启用离线使用。已有本地数据仍可正常使用。' })
    }
  }

  async function install() {
    if (!prompt) return
    const current = prompt
    prompt = null
    update({ installAvailable: false, error: null })
    try {
      await current.prompt()
      await current.userChoice
      // appinstalled confirms installation; accepting a prompt alone does not.
    } catch {
      update({ error: '安装提示未能打开，请通过浏览器菜单添加到主屏幕。' })
    }
  }

  async function checkForUpdates() {
    if (!registration || state.checking || state.updating) return
    if (!state.online) {
      update({ error: '当前离线，连接网络后可以检查更新。' })
      return
    }
    update({ checking: true, error: null })
    try {
      await registration.update()
      reportRegistration()
    } catch {
      update({ error: '检查更新失败，请稍后重试。当前版本和本地数据仍可使用。' })
    } finally {
      update({ checking: false })
    }
  }

  async function applyUpdate() {
    if (!registration?.waiting || state.updating) return
    reloadRequested = true
    update({ updating: true, error: null })
    try {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      updateTimeout = environment.setTimeout(() => {
        reloadRequested = false
        update({ updating: false, error: '更新尚未完成，请稍后重试或关闭应用后重新打开。' })
      }, 15_000)
    } catch {
      reloadRequested = false
      update({ updating: false, error: '更新未能启用，请稍后重试。' })
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    start() { started ??= startOnce(); return started },
    install, checkForUpdates, applyUpdate,
  }
}

let runtime: ReturnType<typeof createPwaRuntime> | undefined

export function getPwaRuntime() {
  if (runtime) return runtime
  let serviceWorker: ServiceWorkerContainer | undefined
  try { serviceWorker = navigator.serviceWorker } catch { /* Restricted contexts still render the app. */ }
  runtime ??= createPwaRuntime({
    production: import.meta.env?.PROD === true,
    secureContext: window.isSecureContext,
    window,
    serviceWorker,
    online: () => navigator.onLine,
    standalone: () => {
      try {
        return window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true
      } catch { return false }
    },
    reload: () => window.location.reload(),
    setTimeout: (callback, milliseconds) => window.setTimeout(callback, milliseconds),
    clearTimeout: timer => window.clearTimeout(timer),
  })
  return runtime
}

/** Safe to call once at startup, before React mounts. Never registers during dev. */
export function initializePwa() {
  void getPwaRuntime().start()
}
