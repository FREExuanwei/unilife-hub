import { parseCourseData, readCourseStorage, COURSE_STORAGE_KEY, emptyCourseData } from '../courses/courseStorage.ts'
import { parseBookmarkData, readBookmarkStorage, BOOKMARK_STORAGE_KEY } from '../bookmarks/bookmarkStorage.ts'
import { DEFAULT_CATEGORIES } from '../bookmarks/bookmarkUtils.ts'
import { initialPomodoro, idleState, validSettings } from '../pomodoro/pomodoroUtils.ts'
import { DEFAULT_REMINDER_SETTINGS, parseReminderSettings, readReminderSettings, REMINDER_STORAGE_KEY } from '../reminders/reminderStorage.ts'
import { THEME_STORAGE_KEY } from '../../utils/theme.ts'
import type { ThemePreference } from '../../utils/theme.ts'
import type { AppBackup, BackupData } from './backupTypes.ts'
import type { OwnedValues } from './storageTransaction.ts'

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
export const INVALID_BACKUP = '该文件不是有效的 UniLife Hub 备份。'
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(INVALID_BACKUP)
  return value as Record<string, unknown>
}
function themePreference(value: unknown): ThemePreference {
  if (!['light', 'dark', 'system'].includes(value as string)) throw Error(INVALID_BACKUP)
  return value as ThemePreference
}
function portableHub(value: unknown) {
  const raw = object(value)
  // Backup files carry settings, never a running cycle or completion notice.
  const p = initialPomodoro()
  if ((raw.version as number) >= 5) {
    const settings = object(object(raw.pomodoro).settings)
    if (!validSettings(settings as unknown as typeof p.settings)) throw Error(INVALID_BACKUP)
    p.settings = { focusMinutes: settings.focusMinutes as number, breakMinutes: settings.breakMinutes as number }
    p.state = idleState(p.settings)
  }
  const loaded = parseCourseData({ ...raw, ...((raw.version as number) >= 5 ? { pomodoro: p } : {}) })
  if (loaded.error) throw Error(INVALID_BACKUP)
  return { ...loaded.data, pomodoro: { ...p, state: idleState(p.settings) } }
}
export function parseBackup(text: string): AppBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw Error('备份文件过大，请选择小于 10 MB 的 JSON 文件。')
  let value: Record<string, unknown>
  try { value = object(JSON.parse(text)) } catch { throw Error(INVALID_BACKUP) }
  if (value.appName !== 'UniLife Hub' || typeof value.backupVersion !== 'number' || typeof value.schemaVersion !== 'number') throw Error(INVALID_BACKUP)
  if (value.backupVersion > 1 || value.schemaVersion > 5) throw Error('该备份来自更新版本，请先升级 UniLife Hub；当前数据不会被修改。')
  if (value.backupVersion !== 1 || ![1, 2, 3, 4, 5].includes(value.schemaVersion)) throw Error(INVALID_BACKUP)
  if (typeof value.exportedAt !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value.exportedAt) || !Number.isFinite(Date.parse(value.exportedAt))) throw Error(INVALID_BACKUP)
  try {
    const data = object(value.data), hub = object(data.hub)
    if (hub.version !== value.schemaVersion) throw Error(INVALID_BACKUP)
    return {
      appName: 'UniLife Hub', backupVersion: 1, schemaVersion: 5, exportedAt: value.exportedAt,
      data: {
        hub: portableHub(hub), bookmarks: parseBookmarkData(data.bookmarks),
        theme: themePreference(data.theme ?? 'system'),
        reminders: data.reminders === undefined ? { ...DEFAULT_REMINDER_SETTINGS } : parseReminderSettings(data.reminders),
      },
    }
  } catch { throw Error(INVALID_BACKUP) }
}
/** A current snapshot is read under the same lock used by all writers. */
export function createBackup(storage: Pick<Storage, 'getItem'>, now = new Date()): AppBackup {
  const hub = readCourseStorage(storage), bookmarks = readBookmarkStorage(storage), reminders = readReminderSettings(storage)
  if (hub.error || bookmarks.error || reminders.error) throw Error('部分本地数据无法读取，请先恢复有效备份或检查浏览器存储，避免导出不完整数据。')
  const theme = themePreference(storage.getItem(THEME_STORAGE_KEY) ?? 'system')
  return {
    appName: 'UniLife Hub', backupVersion: 1, schemaVersion: 5, exportedAt: now.toISOString(),
    data: { hub: portableHub(hub.data), bookmarks: parseBookmarkData(bookmarks.data), theme, reminders: parseReminderSettings(reminders.settings) },
  }
}
export function backupFilename(now = new Date()): string {
  const two = (v: number) => String(v).padStart(2, '0')
  return `unilife-hub-backup-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}.json`
}
export function backupCounts(data: BackupData) {
  return { 学期: data.hub.semesters.length, 课程: data.hub.courses.length, 任务: data.hub.tasks.length, 考试: data.hub.exams.length, 网站收藏: data.bookmarks.bookmarks.length, 学习记录: data.hub.studyRecords.length }
}
export function backupStorageValues(data: BackupData): OwnedValues {
  return {
    [COURSE_STORAGE_KEY]: JSON.stringify(data.hub), [BOOKMARK_STORAGE_KEY]: JSON.stringify(data.bookmarks),
    [THEME_STORAGE_KEY]: data.theme, [REMINDER_STORAGE_KEY]: JSON.stringify(data.reminders),
  }
}
export function resetStorageValues(): OwnedValues {
  return backupStorageValues({ hub: emptyCourseData(), bookmarks: { version: 1, bookmarks: [], categories: [...DEFAULT_CATEGORIES] }, theme: 'system', reminders: { ...DEFAULT_REMINDER_SETTINGS } })
}
