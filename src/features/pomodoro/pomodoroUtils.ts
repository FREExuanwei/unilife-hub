import type { PomodoroAction, PomodoroData, PomodoroMode, PomodoroSettings, PomodoroState } from './pomodoroTypes.ts'
import type { StudyRecord, TimeSegment } from '../study/studyTypes.ts'
import { localDate } from '../study/studyUtils.ts'
export function validSettings(settings: PomodoroSettings): boolean {
  return Number.isInteger(settings.focusMinutes)&&settings.focusMinutes>=1&&settings.focusMinutes<=180&&Number.isInteger(settings.breakMinutes)&&settings.breakMinutes>=1&&settings.breakMinutes<=60
}
export function idleState(settings: PomodoroSettings, mode: PomodoroMode='focus'): PomodoroState {
  const ms=(mode==='focus'?settings.focusMinutes:settings.breakMinutes)*60000
  return {mode,status:'idle',cycleId:null,title:'',courseId:null,semesterId:null,courseNameSnapshot:'',startedAt:null,resumedAt:null,targetEndTime:null,remainingMs:ms,plannedMs:ms,segments:[]}
}
export function initialPomodoro(): PomodoroData { const settings={focusMinutes:25,breakMinutes:5};return {version:1,settings,state:idleState(settings),notice:null} }
export function remainingTime(state: PomodoroState, now: number): number { return state.status==='running' ? Math.min(state.remainingMs,Math.max(0,state.targetEndTime!-now)) : state.remainingMs }
function activeSegments(state: PomodoroState, now: number): TimeSegment[] {
  if(state.status!=='running')return state.segments
  const end=Math.max(state.resumedAt!,Math.min(now,state.targetEndTime!))
  return end>state.resumedAt! ? [...state.segments,{start:state.resumedAt!,end}] : state.segments
}
export function elapsedTime(state: PomodoroState, now: number): number { return Math.min(state.plannedMs,activeSegments(state,now).reduce((sum,s)=>sum+s.end-s.start,0)) }
function studyFromTimer(state: PomodoroState, now: number, complete: boolean): StudyRecord|undefined {
  const segments=activeSegments(state,now),durationMinutes=Math.floor(segments.reduce((sum,s)=>sum+s.end-s.start,0)/60000)
  if(state.mode!=='focus'||durationMinutes<1)return undefined
  const stamp=new Date(now).toISOString(),start=segments[0].start,end=segments.at(-1)!.end
  return {id:`pomodoro:${state.cycleId}`,semesterId:state.semesterId,courseId:state.courseId,courseNameSnapshot:state.courseNameSnapshot,title:state.title||'专注学习',note:'',date:localDate(new Date(start)),startTime:new Date(start).toISOString(),endTime:new Date(end).toISOString(),durationMinutes,source:'pomodoro',createdAt:stamp,updatedAt:stamp,segments,pomodoroCompleted:complete}
}
export function transitionPomodoro(data: PomodoroData, action: PomodoroAction, now: number): {pomodoro:PomodoroData;record?:StudyRecord;error:string|null} {
  const state=data.state,fail=(error:string)=>({pomodoro:data,error}),ok=(pomodoro:PomodoroData,record?:StudyRecord)=>({pomodoro,record,error:null})
  if(action.type==='dismiss')return ok({...data,notice:null})
  if(action.type==='settings'){
    if(!validSettings(action.settings))return fail('专注时间应为 1～180 分钟，休息为 1～60 分钟的整数。')
    if(state.status!=='idle')return fail('请先结束当前计时再修改设置。')
    return ok({...data,settings:action.settings,state:idleState(action.settings,state.mode)})
  }
  if(action.type==='mode')return state.status==='idle'?ok({...data,state:idleState(data.settings,action.mode),notice:null}):fail('请先结束当前计时再切换模式。')
  if(action.type==='start'){
    if(state.status!=='idle')return fail('已有计时正在进行，请暂停或结束后重试。')
    if(!action.cycleId||action.title.length>120||action.courseNameSnapshot.length>120)return fail('请输入不超过 120 字的学习内容。')
    return ok({...data,notice:null,state:{...idleState(data.settings,state.mode),status:'running',cycleId:action.cycleId,title:action.title.trim()||'专注学习',courseId:state.mode==='focus'?action.courseId:null,semesterId:state.mode==='focus'?action.semesterId:null,courseNameSnapshot:state.mode==='focus'?action.courseNameSnapshot:'',startedAt:now,resumedAt:now,targetEndTime:now+state.plannedMs}})
  }
  // Stale events from restored/background tabs cannot affect a later cycle.
  if(state.cycleId!==action.cycleId || state.status==='idle')return ok(data)
  const expired=state.status==='running'&&remainingTime(state,now)===0
  if(action.type==='complete'||expired){
    if(!expired)return ok(data)
    const record=studyFromTimer(state,state.targetEndTime!,true)
    return ok({...data,state:idleState(data.settings,state.mode==='focus'?'break':'focus'),notice:state.mode==='focus'?'专注完成！学习记录已保存，准备好后开始休息吧。':'休息结束！准备好后，开始下一次专注。'},record)
  }
  if(action.type==='pause'){
    if(state.status!=='running')return ok(data)
    return ok({...data,state:{...state,status:'paused',remainingMs:remainingTime(state,now),segments:activeSegments(state,now),targetEndTime:null,resumedAt:null}})
  }
  if(action.type==='resume'){
    if(state.status!=='paused')return ok(data)
    // A clock adjustment must not overlap an already recorded active interval.
    const resumedAt=Math.max(now,state.segments.at(-1)?.end??state.startedAt!)
    return ok({...data,state:{...state,status:'running',resumedAt,targetEndTime:resumedAt+state.remainingMs}})
  }
  const record=action.type==='finish'&&action.save?studyFromTimer(state,now,false):undefined
  return ok({...data,state:idleState(data.settings,state.mode),notice:record?'本次专注已保存。':state.mode==='focus'?'计时已重置，本次未生成学习记录。':'休息已重置。'},record)
}
