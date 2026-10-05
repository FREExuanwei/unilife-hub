import { withHubLock } from '../features/courses/hubLock.ts'
import type { HubLock } from '../features/courses/hubLock.ts'
import { hasPendingRecovery } from '../features/backup/storageTransaction.ts'

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'
export const THEME_STORAGE_KEY = 'unilife-theme'

export interface ThemeStorageResult { preference: ThemePreference; error: string | null }
type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>

export function readThemeStorage(storage?: Pick<Storage, 'getItem'>): ThemeStorageResult {
  try {
    const stored = (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY)
    if (stored === null || stored === 'system') return { preference: 'system', error: null }
    if (stored === 'light' || stored === 'dark') return { preference: stored, error: null }
    return { preference: 'system', error: '主题偏好无法读取，暂时使用系统主题。请检查浏览器存储后重试。' }
  } catch { return { preference: 'system', error: '浏览器存储不可用，暂时使用系统主题；主题偏好无法保存。' } }
}

export function readThemePreference(): ThemePreference {
  return readThemeStorage().preference
}

export async function commitThemePreference(base: ThemePreference, next: ThemePreference, storage?: ThemeStorage, locks?: HubLock): Promise<ThemeStorageResult> {
  try {
    return await withHubLock(() => {
      const loaded = readThemeStorage(storage)
      if (loaded.error) return loaded
      if (!['light', 'dark', 'system'].includes(next)) return { ...loaded, error: '主题偏好无效，未保存。' }
      if (loaded.preference !== base) return { ...loaded, error: '主题偏好已在其他页面更新，请重试。' }
      try {
        const target = storage ?? window.localStorage
        if (hasPendingRecovery(target)) return { ...loaded, error: '上次数据操作需要安全恢复，主题暂时无法保存。请检查浏览器存储后重新加载。' }
        target.setItem(THEME_STORAGE_KEY, next)
        return { preference: next, error: null }
      } catch { return { ...loaded, error: '主题保存失败，浏览器存储不可用或空间不足。请检查后重试。' } }
    }, locks)
  } catch { return { preference: base, error: '主题保存失败，请检查浏览器存储后重试。' } }
}

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
