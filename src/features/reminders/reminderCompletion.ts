import type { PomodoroAction, PomodoroData } from '../pomodoro/pomodoroTypes.ts'
import type { ReminderStorage } from './reminderTypes.ts'
import { readReminderSettings } from './reminderStorage.ts'
import { getReminderRuntime } from './reminderRuntime.ts'
import type { ReminderRuntime } from './reminderRuntime.ts'

export const REMINDER_CLAIMS_STORAGE_KEY='unilife-reminder-claims:v1'
export const SOUND_CLAIMS_STORAGE_KEY='unilife-reminder-sound-claims:v1'
type CueRuntime = Pick<ReminderRuntime,'play'|'audioReady'>
type CueOptions = {storage?:ReminderStorage;runtime?:CueRuntime}

function claimCompletion(cycleId:string,storage?:ReminderStorage,key=REMINDER_CLAIMS_STORAGE_KEY):{claimed:boolean;error:string|null} {
  try {
    const store=storage??window.localStorage,raw=store.getItem(key)
    let cycles:string[]=[]
    if (raw!==null) {
      const value=JSON.parse(raw) as {version?:unknown;cycles?:unknown}
      if (value?.version!==1 || !Array.isArray(value.cycles) || !value.cycles.every(id=>typeof id==='string'&&id.length>0) || new Set(value.cycles).size!==value.cycles.length) throw Error('Invalid claims')
      cycles=value.cycles
    }
    if (cycles.includes(cycleId)) return {claimed:false,error:null}
    store.setItem(key,JSON.stringify({version:1,cycles:[...cycles,cycleId].slice(-256)}))
    return {claimed:true,error:null}
  } catch { return {claimed:false,error:'计时已完成并保存，但提醒状态无法保存，已仅保留页面提示以避免重复提醒。请检查浏览器存储。'} }
}
function naturallyCompleted(before:PomodoroData,after:PomodoroData,now:number):boolean {
  const s=before.state
  return s.status==='running'&&!!s.cycleId&&s.targetEndTime!==null&&s.targetEndTime<=now&&after.state.status==='idle'&&after.state.mode!==s.mode&&!!after.notice?.startsWith(s.mode==='focus'?'专注完成':'休息结束')
}
/** Called under the shared lock by a tab observing the completed snapshot. */
export function deliverCompletionSound(before:PomodoroData,after:PomodoroData,now:number,options:CueOptions={}):string|null {
  if(!naturallyCompleted(before,after,now))return null
  const runtime=options.runtime??getReminderRuntime()
  if(runtime.audioReady&&!runtime.audioReady())return null
  try {
    const store=options.storage??window.localStorage
    const raw=store.getItem(REMINDER_CLAIMS_STORAGE_KEY)
    const primary=raw?JSON.parse(raw) as {version?:unknown;cycles?:unknown}:null
    if(primary?.version!==1||!Array.isArray(primary.cycles)||!primary.cycles.includes(before.state.cycleId))return null
    const loaded=readReminderSettings(store)
    if(loaded.error)return loaded.error
    if(!loaded.settings.sound)return null
    const claim=claimCompletion(before.state.cycleId!,store,SOUND_CLAIMS_STORAGE_KEY)
    if(claim.error)return claim.error
    if(claim.claimed)runtime.play(before.state.mode,{...loaded.settings,vibration:false,notifications:false},before.state.cycleId!)
    return null
  }catch{return '计时已保存，但声音提醒暂时不可用。页面完成提示仍然保留。'}
}

// Called only inside the completing writer's existing unilife-hub:write lock.
// Claim-before-cue prevents replay in another tab, a refresh, or StrictMode.
export function commitTimerWithReminder(before:PomodoroData,after:PomodoroData,action:PomodoroAction,now:number,save:()=>string|null,options:CueOptions={}):{storageError:string|null;reminderError:string|null} {
  const storageError=save()
  if (storageError) return {storageError,reminderError:null}
  const state=before.state
  if (!('cycleId' in action) || state.cycleId!==action.cycleId || !naturallyCompleted(before,after,now)) return {storageError:null,reminderError:null}
  const claim=claimCompletion(action.cycleId,options.storage)
  if (!claim.claimed) return {storageError:null,reminderError:claim.error}
  const loaded=readReminderSettings(options.storage)
  if (loaded.error) return {storageError:null,reminderError:`计时已完成并保存。${loaded.error}当前仅使用页面提示。`}
  const runtime=options.runtime??getReminderRuntime(),ready=!runtime.audioReady||runtime.audioReady()
  let sound=false
  if(loaded.settings.sound&&ready){
    const audioClaim=claimCompletion(action.cycleId,options.storage,SOUND_CLAIMS_STORAGE_KEY)
    if(audioClaim.error)return {storageError:null,reminderError:audioClaim.error}
    sound=audioClaim.claimed
  }
  runtime.play(state.mode,{...loaded.settings,sound},action.cycleId)
  return {storageError:null,reminderError:null}
}
