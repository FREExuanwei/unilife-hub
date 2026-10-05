import type { PomodoroMode } from '../pomodoro/pomodoroTypes.ts'
import type { ReminderSettings } from './reminderTypes.ts'

export const REMINDER_PERMISSION_STORAGE_KEY='unilife-reminder-permission:v1'
export interface ReminderBrowser {
  audioConstructor?: typeof AudioContext
  vibrate?: (pattern:number|number[])=>boolean
  secureContext: boolean
  notification?: {
    readonly permission: NotificationPermission
    requestPermission: ()=>Promise<NotificationPermission>
    create: (title:string,options:NotificationOptions)=>void
  }
}
export interface ReminderRuntime {
  unlockAudio: ()=>Promise<boolean>
  play: (mode:PomodoroMode,settings:ReminderSettings,cycleId:string)=>void
  audioReady?: ()=>boolean
}

function optionalApi<T>(read:()=>T):T|undefined {try{return read()}catch{return undefined}}

export function reminderBrowser(): ReminderBrowser {
  if (typeof window==='undefined') return {secureContext:false}
  const browserWindow=window as Window & {webkitAudioContext?:typeof AudioContext}
  const notificationApi=optionalApi(()=>window.Notification)
  const notifications=typeof notificationApi==='function'?notificationApi:undefined
  const vibration=optionalApi(()=>navigator.vibrate)
  return {
    audioConstructor:optionalApi(()=>window.AudioContext)??optionalApi(()=>browserWindow.webkitAudioContext),
    vibrate:typeof vibration==='function'?vibration.bind(navigator):undefined,
    secureContext:optionalApi(()=>window.isSecureContext)===true,
    notification:notifications?{
      get permission(){return optionalApi(()=>notifications.permission)??'denied'},
      requestPermission:()=>notifications.requestPermission(),
      create:(title,options)=>{new notifications(title,options)},
    }:undefined,
  }
}

export function createReminderRuntime(browser: ReminderBrowser): ReminderRuntime {
  let audio:AudioContext|undefined
  async function unlockAudio():Promise<boolean> {
    try {
      if (!browser.audioConstructor) return false
      if (!audio || audio.state==='closed') audio=new browser.audioConstructor()
      if (audio.state==='suspended') await audio.resume()
      return audio.state==='running'
    } catch { return false }
  }
  function sound(mode:PomodoroMode) {
    if (!audio || audio.state!=='running') return
    const context=audio,frequencies=mode==='focus'?[523.25,659.25,783.99]:[659.25,523.25]
    frequencies.forEach((frequency,index)=>{
      const start=context.currentTime+index*0.18,oscillator=context.createOscillator(),gain=context.createGain()
      oscillator.type='sine'
      oscillator.frequency.setValueAtTime(frequency,start)
      gain.gain.setValueAtTime(0,start)
      gain.gain.linearRampToValueAtTime(0.09,start+0.015)
      gain.gain.linearRampToValueAtTime(0,start+0.14)
      oscillator.connect(gain);gain.connect(context.destination)
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}
      oscillator.start(start);oscillator.stop(start+0.15)
    })
  }
  function play(mode:PomodoroMode,settings:ReminderSettings,cycleId:string) {
    // Optional channels are independent: failure in one must never block the others or page feedback.
    if (settings.sound) try {sound(mode)} catch { /* Persisted page notice remains available. */ }
    if (settings.vibration && browser.vibrate) try {browser.vibrate(mode==='focus'?[120,70,120]:[180])} catch { /* Capability may still be denied. */ }
    if (settings.notifications && browser.secureContext && browser.notification) {
      try {if(browser.notification.permission!=='granted')return;browser.notification.create(mode==='focus'?'专注完成':'休息结束',{
        body:mode==='focus'?'学习记录已保存，准备好后开始休息吧。':'准备好后，开始下一次专注。',
        tag:`unilife-pomodoro:${cycleId}`,silent:true,
      })} catch { /* Some mobile browsers require service worker notifications; page fallback stays. */ }
    }
  }
  return {unlockAudio,play,audioReady:()=>audio?.state==='running'}
}

let runtime:ReminderRuntime|undefined
export function getReminderRuntime():ReminderRuntime { return runtime??=createReminderRuntime(reminderBrowser()) }

export async function requestReminderNotificationPermission(browser:ReminderBrowser=reminderBrowser(),storage?:Pick<Storage,'getItem'|'setItem'>):Promise<{enabled:boolean;error:string|null;message:string}> {
  try {
    if (!browser.secureContext || !browser.notification) return {enabled:false,error:null,message:'此浏览器暂不支持系统通知，将继续显示页面提示。'}
    if (browser.notification.permission==='granted') return {enabled:true,error:null,message:'系统通知已启用。'}
    if (browser.notification.permission==='denied') return {enabled:false,error:null,message:'系统通知已被浏览器拒绝。可在站点权限中修改；页面提示仍会显示。'}
    const store=storage??window.localStorage,raw=store.getItem(REMINDER_PERMISSION_STORAGE_KEY)
    if (raw!==null) {
      const marker=JSON.parse(raw) as {version?:unknown;requested?:unknown}
      if (marker?.version!==1 || marker.requested!==true) throw Error('Invalid permission marker')
      return {enabled:false,error:null,message:'上次未授予通知权限，将继续使用页面提示。可在浏览器站点权限中允许通知。'}
    }
    // Synchronous prefix keeps requestPermission in the originating button gesture.
    // This marker is not a preference and is deliberately excluded from backups.
    store.setItem(REMINDER_PERMISSION_STORAGE_KEY,JSON.stringify({version:1,requested:true}))
    const permission=await browser.notification.requestPermission()
    return permission==='granted'
      ?{enabled:true,error:null,message:'系统通知已启用。'}
      :{enabled:false,error:null,message:permission==='denied'?'通知权限未授予，将继续使用页面提示。':'未选择通知权限，将继续使用页面提示，不会反复询问。'}
  } catch {
    return {enabled:false,error:'无法保存或请求通知权限，系统通知保持关闭。请检查浏览器存储与站点权限。',message:'页面提示仍会显示。'}
  }
}
