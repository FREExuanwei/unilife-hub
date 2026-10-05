export interface ReminderSettings {
  version: 1
  sound: boolean
  vibration: boolean
  notifications: boolean
}

export type ReminderStorage = Pick<Storage, 'getItem' | 'setItem'>
