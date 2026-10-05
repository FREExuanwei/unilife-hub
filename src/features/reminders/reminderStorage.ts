import type { ReminderSettings, ReminderStorage } from './reminderTypes.ts'
import { withHubLock } from '../courses/hubLock.ts'
import type { HubLock } from '../courses/hubLock.ts'
import { hasPendingRecovery } from '../backup/storageTransaction.ts'

export const REMINDER_STORAGE_KEY = 'unilife-reminder-settings:v1'
export const REMINDER_SETTINGS_CHANGED_EVENT = 'unilife:reminder-settings-changed'
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = Object.freeze({version:1,sound:true,vibration:true,notifications:false})

export function parseReminderSettings(value: unknown): ReminderSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid reminder settings')
  const item=value as Record<string,unknown>
  if (item.version!==1 || typeof item.sound!=='boolean' || typeof item.vibration!=='boolean' || typeof item.notifications!=='boolean') throw Error('Invalid reminder settings')
  return {version:1,sound:item.sound,vibration:item.vibration,notifications:item.notifications}
}

export function readReminderSettings(storage?: Pick<Storage,'getItem'>): {settings:ReminderSettings;error:string|null} {
  try {
    const raw=(storage??window.localStorage).getItem(REMINDER_STORAGE_KEY)
    return {settings:raw===null?{...DEFAULT_REMINDER_SETTINGS}:parseReminderSettings(JSON.parse(raw)),error:null}
  } catch {
    return {settings:{...DEFAULT_REMINDER_SETTINGS},error:'无法读取提醒设置，现有设置不会被覆盖。请检查浏览器存储后刷新，或恢复有效备份。'}
  }
}

// Low-level write for an existing hub lock / backup transaction. UI writes use saveReminderSettings.
export function writeReminderSettings(settings: ReminderSettings, storage?: ReminderStorage): string|null {
  try {
    const validated=parseReminderSettings(settings)
    ;(storage??window.localStorage).setItem(REMINDER_STORAGE_KEY,JSON.stringify(validated))
    return null
  } catch {
    return '提醒设置保存失败，浏览器存储不可用或空间不足。原设置仍保留，请检查后重试。'
  }
}

export async function saveReminderSettings(change: Partial<Omit<ReminderSettings,'version'>>,storage?: ReminderStorage,locks?:HubLock): Promise<string|null> {
  try {
    const error=await withHubLock(()=>{
      if (hasPendingRecovery(storage??window.localStorage)) return '上次数据操作尚未安全恢复，提醒设置暂时不可修改。请检查存储后重新加载。'
      const loaded=readReminderSettings(storage)
      if (loaded.error) return loaded.error
      return writeReminderSettings({...loaded.settings,...change},storage)
    },locks)
    if (!error && typeof window!=='undefined') window.dispatchEvent(new Event(REMINDER_SETTINGS_CHANGED_EVENT))
    return error
  } catch { return '提醒设置暂时无法保存，请保留页面并重试。' }
}
