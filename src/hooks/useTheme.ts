import { useEffect, useRef, useState } from 'react'
import { commitThemePreference, readThemeStorage, resolveTheme, THEME_STORAGE_KEY } from '../utils/theme'
import type { Theme } from '../utils/theme'

export function useTheme() {
  const [initial] = useState(readThemeStorage)
  const [preference, setPreference] = useState(initial.preference)
  const [storageError, setStorageError] = useState(initial.error)
  const pending = useRef(false)
  const [systemTheme, setSystemTheme] = useState<Theme>(() => resolveTheme('system'))
  const theme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => setSystemTheme(media.matches ? 'dark' : 'light')
    const sync = () => {
      const loaded = readThemeStorage()
      setPreference(loaded.preference)
      setStorageError(loaded.error)
    }
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) sync()
    }
    media.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorageChange)
    window.addEventListener('unilife:data-restored', sync)
    return () => {
      media.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener('unilife:data-restored', sync)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#f0f1fc')
  }, [theme])

  async function toggleTheme() {
    if (pending.current) return
    pending.current = true
    const next = theme === 'light' ? 'dark' : 'light'
    try {
      const result = await commitThemePreference(preference, next)
      const latest = readThemeStorage()
      setPreference(latest.error ? result.preference : latest.preference)
      setStorageError(result.error ?? latest.error)
    } finally { pending.current = false }
  }

  return { theme, toggleTheme, storageError }
}

