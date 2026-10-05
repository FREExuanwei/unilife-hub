import type { CourseData } from '../courses/courseTypes'
import type { BookmarkData } from '../bookmarks/bookmarkTypes'
import type { ThemePreference } from '../../utils/theme'
import type { ReminderSettings } from '../reminders/reminderTypes'

export interface BackupData {
  hub: CourseData
  bookmarks: BookmarkData
  theme: ThemePreference
  reminders: ReminderSettings
}
export interface AppBackup {
  appName: 'UniLife Hub'
  backupVersion: 1
  schemaVersion: 5
  exportedAt: string
  data: BackupData
}
