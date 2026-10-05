import type { Course } from '../courses/courseTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import type { PomodoroData } from './pomodoroTypes.ts'
import { validSettings } from './pomodoroUtils.ts'
import { pickFields } from '../../utils/dataShape.ts'
export function readPomodoro(value: unknown, semesters: Semester[], courses: Course[]): PomodoroData {
  if(!value||typeof value!=='object')throw Error('Invalid timer data')
  const item=value as Record<string,unknown>,settings=item.settings as Record<string,unknown>|undefined,state=item.state as Record<string,unknown>|undefined
  if(item.version!==1||!settings||!state||(item.notice!==null&&typeof item.notice!=='string')||(typeof item.notice==='string'&&item.notice.length>500)||!validSettings(settings as unknown as PomodoroData['settings']))throw Error('Invalid timer schema')
  if(!['focus','break'].includes(state.mode as string)||!['idle','running','paused'].includes(state.status as string)||!['title','courseNameSnapshot'].every(k=>typeof state[k]==='string'&&(state[k] as string).length<=120))throw Error('Invalid timer fields')
  for(const key of ['courseId','semesterId','cycleId'])if(state[key]!==null&&(typeof state[key]!=='string'||!state[key]))throw Error('Invalid timer ID')
  for(const key of ['startedAt','resumedAt','targetEndTime'])if(state[key]!==null&&(typeof state[key]!=='number'||!Number.isSafeInteger(state[key])||!Number.isFinite(new Date(state[key]).getTime())))throw Error('Invalid timer timestamp')
  if(typeof state.plannedMs!=='number'||!Number.isInteger(state.plannedMs/60000)||state.plannedMs<60000||state.plannedMs>(state.mode==='focus'?180:60)*60000||typeof state.remainingMs!=='number'||!Number.isInteger(state.remainingMs)||state.remainingMs<0||state.remainingMs>state.plannedMs||!Array.isArray(state.segments)||state.segments.length>10000)throw Error('Invalid timer durations')
  const parsed={version:1,notice:item.notice,settings:pickFields(settings,['focusMinutes','breakMinutes']),state:pickFields(state,['mode','status','cycleId','title','courseId','semesterId','courseNameSnapshot','startedAt','resumedAt','targetEndTime','remainingMs','plannedMs'])} as unknown as PomodoroData
  parsed.state.segments=state.segments.map(segment=>pickFields(segment as Record<string,unknown>,['start','end'])) as unknown as PomodoroData['state']['segments']
  const s=parsed.state
  if(s.semesterId!==null&&!semesters.some(semester=>semester.id===s.semesterId))throw Error('Missing timer semester')
  if(s.courseId!==null&&!courses.some(course=>course.id===s.courseId&&course.semesterId===s.semesterId))throw Error('Missing timer course')
  if(s.status==='idle'){
    if(s.cycleId!==null||s.startedAt!==null||s.resumedAt!==null||s.targetEndTime!==null||s.segments.length||s.remainingMs!==s.plannedMs||s.courseId!==null||s.semesterId!==null)throw Error('Invalid idle timer')
  }else{
    if(!s.cycleId||s.startedAt===null||s.remainingMs<=0||s.segments.some((segment,i)=>!segment||!Number.isSafeInteger(segment.start)||!Number.isSafeInteger(segment.end)||segment.end<=segment.start||segment.start<s.startedAt!||(i>0&&segment.start<s.segments[i-1].end)))throw Error('Invalid active timer')
    const spent=s.segments.reduce((sum,segment)=>sum+segment.end-segment.start,0)
    if(spent+s.remainingMs!==s.plannedMs)throw Error('Inconsistent elapsed timer')
    if(s.status==='running'&&(s.resumedAt===null||s.targetEndTime===null||s.targetEndTime-s.resumedAt!==s.remainingMs||s.resumedAt<s.startedAt||s.resumedAt<(s.segments.at(-1)?.end??s.startedAt)))throw Error('Invalid running timer')
    if(s.status==='paused'&&(s.resumedAt!==null||s.targetEndTime!==null))throw Error('Invalid paused timer')
  }
  return parsed
}
