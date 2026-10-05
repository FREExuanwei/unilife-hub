export const RECOVERY_KEY = 'unilife-recovery:v1'
export const OWNED_KEYS = ['unilife-courses:v1', 'unilife-bookmarks:v1', 'unilife-theme', 'unilife-reminder-settings:v1'] as const
export type OwnedKey = typeof OWNED_KEYS[number]
export type OwnedValues = Record<OwnedKey, string | null>
type LocalStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const failure = '数据保存失败，请先导出备份或检查浏览器存储空间。当前数据已保留。'
export function hasPendingRecovery(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    const raw = storage.getItem(RECOVERY_KEY)
    return raw !== null && (JSON.parse(raw) as Record<string, unknown>).phase !== 'committed'
  } catch { return true }
}
function isOwnedValues(value: unknown): value is OwnedValues {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return Object.keys(item).length === OWNED_KEYS.length && OWNED_KEYS.every(k => Object.hasOwn(item, k) && (item[k] === null || typeof item[k] === 'string'))
}
function replace(values: OwnedValues, storage: LocalStore) {
  // Reclaim shrinking values before expanding another key during rollback.
  // The durable journal survives every intermediate step.
  for (const key of OWNED_KEYS) {
    const value = values[key], current = storage.getItem(key)
    if (value === null) storage.removeItem(key)
    else if (current !== null && value.length <= current.length) storage.setItem(key, value)
  }
  for (const key of OWNED_KEYS) {
    const value = values[key]
    if (value !== null && storage.getItem(key) !== value) storage.setItem(key, value)
  }
}
/** Caller holds the shared write lock. A journal is never part of a portable backup. */
export function applyStorageTransaction(next: OwnedValues, storage: LocalStore): string | null {
  let before: OwnedValues | undefined
  let prepared = false
  try {
    if (!isOwnedValues(next)) return '无法恢复：数据结构无效。'
    const recoveryError = recoverStorageTransaction(storage)
    if (recoveryError) return recoveryError
    before = Object.fromEntries(OWNED_KEYS.map(k => [k, storage.getItem(k)])) as OwnedValues
    storage.setItem(RECOVERY_KEY, JSON.stringify({ version: 1, phase: 'prepared', before }))
    prepared = true
    replace(next, storage)
    // This final durable marker distinguishes committed data from an interrupted write.
    storage.setItem(RECOVERY_KEY, JSON.stringify({ version: 1, phase: 'committed', before }))
    try { storage.removeItem(RECOVERY_KEY) } catch { /* Startup cleans a committed journal. */ }
    return null
  } catch {
    if (before && prepared) {
      try { replace(before, storage); storage.removeItem(RECOVERY_KEY) }
      catch { return '恢复中断，原数据的保护副本仍保留。请检查存储空间后重新加载，暂时不要修改数据。' }
    }
    return failure
  }
}
/** Run before mounting any provider so no timer or initializer can replace prior values. */
export function recoverStorageTransaction(storage: LocalStore): string | null {
  try {
    const raw = storage.getItem(RECOVERY_KEY)
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') throw Error('Invalid journal')
    const item = value as Record<string, unknown>
    if (item.version !== 1 || !['prepared', 'committed'].includes(item.phase as string) || !isOwnedValues(item.before)) throw Error('Invalid journal')
    if (item.phase === 'prepared') replace(item.before, storage)
    storage.removeItem(RECOVERY_KEY)
    return null
  } catch { return '无法完成上次数据操作的安全恢复。保护副本仍保留，请检查浏览器存储后重新加载。' }
}
