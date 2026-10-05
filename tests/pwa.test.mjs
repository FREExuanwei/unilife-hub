import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import { inflateSync } from 'node:zlib'

const buildModule = await import('../scripts/pwa-build.ts').catch(() => null)
const runtimeModule = await import('../src/features/pwa/pwaRuntime.ts').catch(() => null)

function buildApi() {
  assert.ok(buildModule, 'PWA build generator is implemented')
  return buildModule
}
function runtimeApi() {
  assert.ok(runtimeModule, 'PWA browser runtime is implemented')
  return runtimeModule
}

async function outputFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'unilife-pwa-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, 'assets'))
  await mkdir(join(directory, 'icons'))
  const files = {
    'index.html': '<html>app shell</html>',
    'assets/main-abc.js': 'main',
    'assets/Settings-def.js': 'lazy settings',
    'assets/Statistics-ghi.js': 'lazy statistics',
    'assets/main-jkl.css': 'body{}',
    'icons/icon-192.png': 'icon',
    'manifest.webmanifest': '{}',
    'theme-bootstrap.js': 'theme',
    'sw.js': 'old worker',
  }
  await Promise.all(Object.entries(files).map(([name, value]) => writeFile(join(directory, name), value)))
  return directory
}

test('precache includes unvisited lazy routes and public assets, changes when their contents change', async t => {
  const { createPrecache } = buildApi()
  const directory = await outputFixture(t)
  const first = await createPrecache(directory)
  assert.deepEqual(first.urls, ['/assets/Settings-def.js', '/assets/Statistics-ghi.js', '/assets/main-abc.js', '/assets/main-jkl.css', '/icons/icon-192.png', '/index.html', '/manifest.webmanifest', '/theme-bootstrap.js'])
  await writeFile(join(directory, 'icons/icon-192.png'), 'new icon at same URL')
  assert.notEqual((await createPrecache(directory)).revision, first.revision)
})

function workerHarness(source, { failUrl = null, varyOrigin = false } = {}) {
  const listeners = new Map()
  const stores = new Map()
  let skips = 0
  let claims = 0
  const base = 'https://unilife.example'
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map())
      const entries = stores.get(name)
      return {
        async addAll(urls) {
          if (urls.includes(failUrl)) throw new Error('asset unavailable')
          for (const url of urls) entries.set(new URL(url, base).href, new Response(url === '/index.html' ? '<html>offline app</html>' : url))
        },
        async match(request, options) {
          // Vite's preview responses vary on Origin; module/CSS requests add it.
          if (varyOrigin && request.headers?.get('Origin') && !options?.ignoreVary) return undefined
          const url = new URL(typeof request === 'string' ? request : request.url, base)
          if (options?.ignoreSearch) url.search = ''
          return entries.get(url.href)?.clone()
        },
      }
    },
    async keys() { return [...stores.keys()] },
    async delete(name) { return stores.delete(name) },
    async match(request, options) {
      for (const name of stores.keys()) {
        const response = await (await this.open(name)).match(request, options)
        if (response) return response
      }
    },
  }
  vm.runInNewContext(source, {
    self: { location: { origin: base }, addEventListener: (type, listener) => listeners.set(type, listener), skipWaiting: async () => { skips++ }, clients: { claim: async () => { claims++ } } },
    caches, URL, Request, Response, fetch: async () => { throw new TypeError('offline') }, console,
  })
  async function lifecycle(type, extra = {}) {
    let task
    listeners.get(type)({ ...extra, waitUntil(promise) { task = promise } })
    await task
  }
  async function request(url, { mode = 'cors', method = 'GET', headers } = {}) {
    let response
    listeners.get('fetch')({ request: { url, mode, method, headers }, respondWith(value) { response = value } })
    return response ? await response : undefined
  }
  return { lifecycle, request, stores, get skips() { return skips }, get claims() { return claims } }
}

test('offline navigation serves the full shell and generated lazy chunks while external requests bypass cache', async () => {
  const { generateWorker } = buildApi()
  const worker = workerHarness(generateWorker({ revision: 'one', urls: ['/index.html', '/assets/Settings-def.js', '/theme-bootstrap.js'] }))
  await worker.lifecycle('install')
  assert.equal(worker.skips, 0, 'install must wait for user approval on updates')
  await worker.lifecycle('activate')
  assert.equal(await (await worker.request('https://unilife.example/settings?tab=data', { mode: 'navigate' })).text(), '<html>offline app</html>')
  assert.equal(await (await worker.request('https://unilife.example/assets/Settings-def.js')).text(), '/assets/Settings-def.js')
  assert.equal(await worker.request('https://github.com/favicon.ico'), undefined)
  assert.equal(await worker.request('https://unilife.example/api/data'), undefined)
  assert.equal(await worker.request('https://unilife.example/settings', { method: 'POST' }), undefined)
})

test('failed precaching rejects install; approved activation cleans only UniLife caches', async () => {
  const { generateWorker } = buildApi()
  const broken = workerHarness(generateWorker({ revision: 'broken', urls: ['/index.html', '/assets/missing.js'] }), { failUrl: '/assets/missing.js' })
  await assert.rejects(broken.lifecycle('install'), /asset unavailable/)
  assert.equal(broken.skips, 0)
  const worker = workerHarness(generateWorker({ revision: 'new', urls: ['/index.html'] }))
  worker.stores.set('other-app-cache', new Map())
  worker.stores.set('unilife-hub-shell-oldest', new Map())
  worker.stores.set('unilife-hub-shell-previous', new Map())
  await worker.lifecycle('install')
  await worker.lifecycle('message', { data: { type: 'SKIP_WAITING' } })
  assert.equal(worker.skips, 1)
  await worker.lifecycle('activate')
  assert.equal(worker.stores.has('other-app-cache'), true)
  assert.equal(worker.stores.has('unilife-hub-shell-oldest'), false)
  assert.equal(worker.stores.has('unilife-hub-shell-previous'), true, 'other open tabs can still load their prior lazy chunks')
  assert.equal(worker.claims, 1)
})

function browserFixture({ production = true, supported = true, waiting = false, rejectRegistration = false } = {}) {
  const window = new EventTarget()
  const serviceWorker = new EventTarget()
  let registrations = 0
  let reloads = 0
  const messages = []
  const registration = new EventTarget()
  registration.active = {}
  registration.waiting = waiting ? { postMessage(message) { messages.push(message) } } : null
  registration.installing = null
  registration.update = async () => {}
  serviceWorker.controller = {}
  serviceWorker.register = async (url, options) => {
    registrations++
    assert.equal(url, '/sw.js')
    assert.deepEqual(options, { scope: '/', updateViaCache: 'none' })
    if (rejectRegistration) throw new Error('blocked')
    return registration
  }
  const environment = { production, secureContext: true, window, serviceWorker: supported ? serviceWorker : undefined, online: () => true, standalone: () => false, reload: () => { reloads++ }, setTimeout: () => 0, clearTimeout() {} }
  return { environment, window, serviceWorker, registration, messages, get registrations() { return registrations }, get reloads() { return reloads } }
}

test('PWA registration is production only and unsupported/failed browsers keep the app usable', async () => {
  const { createPwaRuntime } = runtimeApi()
  for (const options of [{ production: false }, { supported: false }, { rejectRegistration: true }]) {
    const browser = browserFixture(options)
    const runtime = createPwaRuntime(browser.environment)
    await runtime.start()
    assert.equal(browser.registrations, options.rejectRegistration ? 1 : 0)
    assert.equal(runtime.getSnapshot().offlineReady, false)
    assert.equal(runtime.getSnapshot().status, options.production === false ? 'development' : options.supported === false ? 'unsupported' : 'error')
  }
})

test('waiting updates only activate after explicit action and reload only the consenting tab', async () => {
  const { createPwaRuntime } = runtimeApi()
  const browser = browserFixture({ waiting: true })
  const runtime = createPwaRuntime(browser.environment)
  await runtime.start()
  assert.equal(runtime.getSnapshot().offlineReady, true)
  assert.equal(runtime.getSnapshot().updateAvailable, true)
  assert.deepEqual(browser.messages, [])
  browser.serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(browser.reloads, 0)
  await runtime.applyUpdate()
  assert.deepEqual(browser.messages, [{ type: 'SKIP_WAITING' }])
  browser.serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(browser.reloads, 1)
})

test('offline and install lifecycle are reflected without mutating local app data', async () => {
  const { createPwaRuntime } = runtimeApi()
  const browser = browserFixture()
  const runtime = createPwaRuntime(browser.environment)
  let notices = 0
  runtime.subscribe(() => notices++)
  await runtime.start()
  browser.window.dispatchEvent(new Event('offline'))
  assert.equal(runtime.getSnapshot().online, false)
  browser.window.dispatchEvent(new Event('online'))
  assert.equal(runtime.getSnapshot().online, true)
  const prompt = new Event('beforeinstallprompt', { cancelable: true })
  let prompts = 0
  prompt.prompt = async () => { prompts++ }
  prompt.userChoice = Promise.resolve({ outcome: 'accepted' })
  browser.window.dispatchEvent(prompt)
  assert.equal(prompt.defaultPrevented, true)
  assert.equal(runtime.getSnapshot().installAvailable, true)
  await runtime.install()
  assert.equal(prompts, 1)
  browser.window.dispatchEvent(new Event('appinstalled'))
  assert.equal(runtime.getSnapshot().installed, true)
  assert.ok(notices >= 4)
})

test('theme bootstrap handles storage denial and applies matching theme color before the app mounts', async () => {
  const source = await readFile(new URL('../public/theme-bootstrap.js', import.meta.url), 'utf8').catch(() => null)
  assert.ok(source, 'External initial theme bootstrap is implemented')
  for (const [preference, systemDark, expected] of [['dark', false, 'dark'], ['light', true, 'light'], [null, true, 'dark'], ['denied', false, 'light']]) {
    const document = { documentElement: { dataset: {} }, querySelector: () => ({ setAttribute(name, value) { document.color = value } }) }
    vm.runInNewContext(source, { document, localStorage: { getItem() { if (preference === 'denied') throw new Error('denied'); return preference } }, matchMedia: () => ({ matches: systemDark }) })
    assert.equal(document.documentElement.dataset.theme, expected)
    assert.equal(document.color, expected === 'dark' ? '#0b1020' : '#f0f1fc')
  }
})

test('installable manifest points to valid sized PNG icons with an opaque maskable background', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(manifest.name, 'UniLife Hub')
  assert.equal(manifest.short_name, 'UniLife')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.display, 'standalone')
  const expectedIcons = [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]
  for (const [name, size] of expectedIcons) {
    const png = await readFile(new URL(`../public/icons/${name}`, import.meta.url)).catch(() => null)
    assert.ok(png, `${name} exists`)
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    if (name.includes('maskable')) {
      const data = []
      for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset)
        if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') data.push(png.subarray(offset + 8, offset + 8 + length))
        offset += length + 12
      }
      const pixels = inflateSync(Buffer.concat(data))
      assert.equal(pixels[4], 255, 'maskable top-left background is opaque')
      assert.equal(pixels[(size - 1) * (size * 4 + 1) + size * 4], 255, 'maskable bottom-right background is opaque')
    }
  }
  for (const icon of manifest.icons) assert.ok(expectedIcons.some(([name, size]) => icon.src === `/icons/${name}` && icon.sizes === `${size}x${size}`))
})

test('update-check and activation failures become usable UI states instead of unhandled errors', async () => {
  const { createPwaRuntime } = runtimeApi()
  const browser = browserFixture({ waiting: true })
  const runtime = createPwaRuntime(browser.environment)
  await runtime.start()
  browser.registration.update = async () => { throw new Error('network down') }
  await runtime.checkForUpdates()
  assert.equal(runtime.getSnapshot().checking, false)
  assert.ok(runtime.getSnapshot().error)
  browser.registration.waiting.postMessage = () => { throw new Error('worker unavailable') }
  await runtime.applyUpdate()
  assert.equal(runtime.getSnapshot().updating, false)
  assert.ok(runtime.getSnapshot().error)
  browser.serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(browser.reloads, 0)
})

test('the prior tab can load its old chunk but unrelated caches are not used as app resources', async () => {
  const { generateWorker } = buildApi()
  const worker = workerHarness(generateWorker({ revision: 'current', urls: ['/index.html', '/assets/main-new.js'] }))
  worker.stores.set('other-app-cache', new Map([['https://unilife.example/assets/missing.js', new Response('unrelated')]]))
  worker.stores.set('unilife-hub-shell-previous', new Map([['https://unilife.example/assets/main-old.js', new Response('previous app')]]))
  await worker.lifecycle('install')
  await worker.lifecycle('activate')
  assert.equal(await (await worker.request('https://unilife.example/assets/main-old.js')).text(), 'previous app')
  await assert.rejects(worker.request('https://unilife.example/assets/missing.js'), /offline/)
})

test('restricted browser API getters do not prevent the main app from mounting', () => {
  const { getPwaRuntime } = runtimeApi()
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: false, matchMedia() { throw new Error('blocked') }, setTimeout, clearTimeout } })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true, get serviceWorker() { throw new Error('blocked') } } })
  try {
    assert.doesNotThrow(() => getPwaRuntime())
    assert.equal(getPwaRuntime().getSnapshot().installed, false)
  } finally {
    if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow)
    else delete globalThis.window
    if (priorNavigator) Object.defineProperty(globalThis, 'navigator', priorNavigator)
    else delete globalThis.navigator
  }
})

test('offline static chunks ignore transport Vary headers added by production preview hosting', async () => {
  const { generateWorker } = buildApi()
  const worker = workerHarness(generateWorker({ revision: 'vary', urls: ['/index.html', '/assets/main.js', '/assets/main.css'] }), { varyOrigin: true })
  await worker.lifecycle('install')
  const headers = new Headers({ Origin: 'https://unilife.example' })
  assert.equal(await (await worker.request('https://unilife.example/assets/main.js', { headers })).text(), '/assets/main.js')
  assert.equal(await (await worker.request('https://unilife.example/assets/main.css', { headers })).text(), '/assets/main.css')
})
