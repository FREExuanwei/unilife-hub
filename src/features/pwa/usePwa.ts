import { useSyncExternalStore } from 'react'
import { getPwaRuntime } from './pwaRuntime'

export function usePwa() {
  const runtime = getPwaRuntime()
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
  return { ...state, install: runtime.install, checkForUpdates: runtime.checkForUpdates, applyUpdate: runtime.applyUpdate }
}
