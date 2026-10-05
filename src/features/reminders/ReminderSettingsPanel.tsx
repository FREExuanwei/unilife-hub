import { useEffect, useId, useState } from 'react'
import { Bell, Volume2, Vibrate } from 'lucide-react'
import { getReminderRuntime, reminderBrowser, requestReminderNotificationPermission } from './reminderRuntime'
import { readReminderSettings, REMINDER_SETTINGS_CHANGED_EVENT, REMINDER_STORAGE_KEY, saveReminderSettings } from './reminderStorage'
import type { ReminderSettings } from './reminderTypes'

export default function ReminderSettingsPanel() {
  const id=useId(),[loaded,setLoaded]=useState(readReminderSettings),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saveError,setSaveError]=useState<string|null>(null),[browser,setBrowser]=useState(reminderBrowser)
  const settings=loaded.settings,error=loaded.error??saveError
  useEffect(()=>{
    const reload=()=>{setLoaded(readReminderSettings());setBrowser(reminderBrowser());setSaveError(null)}
    const sync=(event:StorageEvent)=>{if (event.key===REMINDER_STORAGE_KEY || event.key===null) reload()}
    window.addEventListener('storage',sync)
    window.addEventListener(REMINDER_SETTINGS_CHANGED_EVENT,reload)
    window.addEventListener('unilife:data-restored',reload)
    window.addEventListener('focus',reload)
    return ()=>{window.removeEventListener('storage',sync);window.removeEventListener(REMINDER_SETTINGS_CHANGED_EVENT,reload);window.removeEventListener('unilife:data-restored',reload);window.removeEventListener('focus',reload)}
  },[])
  async function change(key:'sound'|'vibration',value:boolean) {
    setBusy(true);setSaveError(null);setMessage('')
    if (key==='sound' && value) void getReminderRuntime().unlockAudio()
    const result=await saveReminderSettings({[key]:value})
    setLoaded(readReminderSettings());setSaveError(result);setBusy(false)
    if (!result) setMessage('提醒设置已保存。')
  }
  async function notifications(value:boolean) {
    setBusy(true);setSaveError(null);setMessage('')
    const permission=value?await requestReminderNotificationPermission():{enabled:false,error:null,message:'系统通知已关闭，页面提示仍会显示。'}
    const result=await saveReminderSettings({notifications:permission.enabled})
    setLoaded(readReminderSettings());setBrowser(reminderBrowser());setSaveError(result??permission.error);setMessage(permission.message);setBusy(false)
  }
  async function preview() {
    setBusy(true)
    const supported=await getReminderRuntime().unlockAudio()
    if (supported) getReminderRuntime().play('focus',{...settings,sound:true,vibration:false,notifications:false},'preview')
    setMessage(supported?'已播放专注完成提示音。':'浏览器暂未允许声音，计时结束仍会显示页面提示。')
    setBusy(false)
  }
  const notificationSupported=browser.secureContext&&!!browser.notification
  const notificationGranted=browser.notification?.permission==='granted'
  const blocked=busy||!!loaded.error
  const rows:[keyof Omit<ReminderSettings,'version'>,string,string,typeof Volume2][]=[
    ['sound','提示音','专注完成和休息结束使用不同的短提示音。',Volume2],
    ['vibration','振动','支持振动的设备会在计时结束时轻轻提醒。',Vibrate],
    ['notifications','系统通知','仅在你开启并允许浏览器权限后发送。',Bell],
  ]
  return <section className="reminder-settings-card" aria-labelledby={`${id}-heading`}>
    <p className="eyebrow">A GENTLE REMINDER</p><h2 id={`${id}-heading`}><Bell size={21} aria-hidden="true" />计时提醒</h2>
    <p className="reminder-settings-intro">让专注有一个温柔的收尾。计时完成后，所有页面都会显示提示。</p>
    <div className="reminder-settings-rows">{rows.map(([key,title,description,Icon])=><label className="reminder-setting-row" key={key} htmlFor={`${id}-${key}`}>
      <span className="reminder-setting-icon"><Icon size={20} aria-hidden="true" /></span>
      <span className="reminder-setting-copy"><strong>{title}</strong><span>{description}</span></span>
      <input type="checkbox" id={`${id}-${key}`} role="switch" checked={key==='notifications'?settings.notifications&&notificationGranted:settings[key]} disabled={blocked||(key==='notifications'&&!notificationSupported)} onChange={event=>void (key==='notifications'?notifications(event.target.checked):change(key,event.target.checked))} />
    </label>)}</div>
    <div className="reminder-settings-actions"><button type="button" className="secondary-button" disabled={blocked||!browser.audioConstructor} onClick={()=>void preview()}><Volume2 size={16} aria-hidden="true" />试听提示音</button><p className="field-hint">设置仅保存在当前浏览器。</p></div>
    {(!browser.audioConstructor||!browser.vibrate)&&<p className="field-hint">{!browser.audioConstructor?'此浏览器不支持提示音。':''}{!browser.vibrate?'此设备或浏览器未提供振动。':''}页面提示会正常显示。</p>}
    {!notificationSupported&&<p className="field-hint">当前环境不支持系统通知，计时完成后使用页面提示。</p>}
    {notificationSupported&&!notificationGranted&&<p className="field-hint">{browser.notification?.permission==='denied'?'系统通知权限已被拒绝，可在浏览器的站点权限中修改。':'开启系统通知时才会请求权限；未允许时使用页面提示。'}</p>}
    {message&&<p className="reminder-settings-message" role="status">{message}</p>}
    {error&&<p className="form-save-error" role="alert">{error}</p>}
  </section>
}
