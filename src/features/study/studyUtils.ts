import type { Course } from '../courses/courseTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import { parseLocalDate, calendarDay } from '../semester/weekUtils.ts'
import { selectDefaultSemester } from '../semester/semesterUtils.ts'
import type { ManualStudyInput, StudyDraft, StudyErrors, StudyRecord, StudyFilters, StudyStats, TimeSegment } from './studyTypes.ts'

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function formatDuration(minutes: number): string {
  const value=Math.max(0,Math.floor(minutes)),hours=Math.floor(value/60),rest=value%60
  return hours ? `${hours}小时${rest?`${rest}分钟`:''}` : `${rest}分钟`
}
export function studyCourseSnapshot(old:StudyRecord|undefined,courseId:string|null,courses:Course[]):string{
  if(courseId)return old?.courseId===courseId&&old.courseNameSnapshot?old.courseNameSnapshot:courses.find(c=>c.id===courseId)?.name??''
  return old?.courseId?'':old?.courseNameSnapshot??''
}
export function studyRange(now: Date, range: 'week'|'month'): [string,string] {
  const first=new Date(now.getFullYear(),now.getMonth(),now.getDate())
  if(range==='week') first.setDate(first.getDate()-(first.getDay()+6)%7)
  else first.setDate(1)
  const last=new Date(first)
  if(range==='week')last.setDate(last.getDate()+6)
  else last.setMonth(last.getMonth()+1,0)
  return [localDate(first),localDate(last)]
}
export function validateStudy(draft: StudyDraft, semesters: Semester[], courses: Course[], now?: Date): StudyErrors {
  const errors: StudyErrors={}
  if(!draft.title.trim() || draft.title.trim().length>120)errors.title='请输入学习内容（1～120 个字符）。'
  if(draft.note.length>3000)errors.note='备注不能超过 3000 个字符。'
  if(!parseLocalDate(draft.date))errors.date='请选择有效日期。'
  else if(now && draft.date>localDate(now))errors.date='不能记录尚未发生的学习。'
  if(!Number.isInteger(draft.durationMinutes)||draft.durationMinutes<=0||draft.durationMinutes>1440)errors.durationMinutes='学习时长必须为 1～1440 的整数分钟。'
  if(draft.semesterId!==null && !semesters.some(s=>s.id===draft.semesterId))errors.semesterId='原学期已变更，请重新选择课程或日期。'
  const course=courses.find(c=>c.id===draft.courseId)
  if(draft.courseId!==null && (!course || course.semesterId!==draft.semesterId))errors.courseId='关联课程无效，请重新选择。'
  if(draft.courseNameSnapshot.length>120)errors.courseNameSnapshot='课程名称快照过长。'
  if(!['manual','pomodoro'].includes(draft.source))errors.source='学习来源无效。'
  if((draft.startTime===null)!==(draft.endTime===null))errors.startTime='请同时填写开始和结束时间。'
  if(draft.startTime!==null && draft.endTime!==null){
    const start=Date.parse(draft.startTime),end=Date.parse(draft.endTime)
    if(!validTimestamp(draft.startTime)||!validTimestamp(draft.endTime)||end<=start)errors.endTime='结束时间必须晚于开始时间。'
    else if(localDate(new Date(start))!==draft.date)errors.date='记录日期与开始时间不一致。'
    else if(now && end>now.getTime())errors.endTime='结束时间不能在未来。'
    // Segmented focus can span a long pause; only active intervals count.
    if(!draft.segments && (end-start>1440*60000||Math.floor((end-start)/60000)!==draft.durationMinutes))errors.durationMinutes='时长与开始、结束时间不一致，单条学习不能超过 24 小时。'
  }
  if(draft.segments){
    const sum=draft.segments.reduce((total,s)=>total+s.end-s.start,0)
    if(draft.source!=='pomodoro'||!draft.startTime||!draft.endTime||!draft.segments.length||draft.segments.length>10000||draft.segments.some((s,i)=>!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end<=s.start||s.start<Date.parse(draft.startTime!)||s.end>Date.parse(draft.endTime!)||(i>0&&s.start<draft.segments![i-1].end))||Math.floor(sum/60000)!==draft.durationMinutes)errors.segments='专注时间段无效。'
  }
  return errors
}
export function validTimestamp(value: string): boolean { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value)) }
export function manualStudyDraft(input: ManualStudyInput, semesters: Semester[], courses: Course[], now: Date): StudyDraft {
  const date=parseLocalDate(input.date)
  if(!date)throw Error('请选择有效日期。')
  const selected=selectDefaultSemester(semesters,date),course=courses.find(c=>c.id===input.courseId)
  let startTime: string|null=null,endTime: string|null=null,durationMinutes=input.minutes
  if(input.mode==='range'){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.end))throw Error('请填写有效的开始和结束时间。')
    const start=new Date(date),end=new Date(date)
    const [a,b]=input.start.split(':').map(Number),[c,d]=input.end.split(':').map(Number)
    start.setHours(a,b,0,0);end.setHours(c,d,0,0)
    if(end<=start)throw Error('结束时间必须晚于开始时间；跨午夜请分为两条手动记录。')
    startTime=start.toISOString();endTime=end.toISOString();durationMinutes=Math.floor((end.getTime()-start.getTime())/60000)
  }
  const draft: StudyDraft={title:input.title.trim(),note:input.note.trim(),date:input.date,courseId:input.courseId,semesterId:course?.semesterId??(selected.isWithin?selected.semester?.id??null:null),courseNameSnapshot:course?.name??'',startTime,endTime,durationMinutes,source:'manual'}
  const error=Object.values(validateStudy(draft,semesters,courses,now))[0]
  if(error)throw Error(error)
  return draft
}
// Split actual active intervals at local midnights. Cumulative flooring retains integer totals.
export function distributeMinutes(record: StudyRecord): Map<string,number> {
  if(!record.startTime||!record.endTime)return new Map([[record.date,record.durationMinutes]])
  const segments: TimeSegment[]=record.segments??[{start:Date.parse(record.startTime),end:Date.parse(record.endTime)}]
  const raw=new Map<string,number>()
  for(const segment of segments){
    let cursor=segment.start
    while(cursor<segment.end){
      const date=new Date(cursor),next=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1).getTime(),end=Math.min(next,segment.end)
      const key=localDate(date);raw.set(key,(raw.get(key)??0)+end-cursor);cursor=end
    }
  }
  const result=new Map<string,number>();let cumulative=0,allocated=0
  const entries=[...raw]
  entries.forEach(([day,ms],index)=>{cumulative+=ms;const total=index===entries.length-1?record.durationMinutes:Math.min(record.durationMinutes,Math.floor(cumulative/60000));result.set(day,total-allocated);allocated=total})
  return result
}
export function aggregateStudy(records: StudyRecord[], courses: Course[], now: Date, range: 'week'|'month'): StudyStats {
  const today=localDate(now),[weekStart,weekEnd]=studyRange(now,'week'),[monthStart,monthEnd]=studyRange(now,'month'),[start,end]=range==='week'?[weekStart,weekEnd]:[monthStart,monthEnd]
  const days=new Map<string,number>(),byCourse=new Map<string|null,{id:string|null;name:string;semesterId:string|null;minutes:number}>()
  const courseMap=new Map(courses.map(c=>[c.id,c]));let todayPomodoros=0,weekPomodoros=0
  for(const record of records){
    if(record.date>today || (record.endTime && Date.parse(record.endTime)>now.getTime()))continue
    let selectedMinutes=0
    for(const [day,minutes] of distributeMinutes(record)){
      if(day>today)continue
      days.set(day,(days.get(day)??0)+minutes)
      if(day>=start && day<=end)selectedMinutes+=minutes
    }
    if(selectedMinutes){
      const course=record.courseId?courseMap.get(record.courseId):undefined,key=course?.id??null
      const prior=byCourse.get(key)??{id:key,name:course?.name??'其他学习',semesterId:course?.semesterId??null,minutes:0}
      prior.minutes+=selectedMinutes;byCourse.set(key,prior)
    }
    const finishedDay=record.endTime?localDate(new Date(record.endTime)):record.date
    if(record.source==='pomodoro'&&record.pomodoroCompleted){if(finishedDay===today)todayPomodoros++;if(finishedDay>=weekStart&&finishedDay<=today)weekPomodoros++}
  }
  const ordinal=(day:string)=>calendarDay(parseLocalDate(day)!)
  const active=[...days].filter(([,minutes])=>minutes>0).map(([day])=>ordinal(day)).sort((a,b)=>a-b)
  const daySet=new Set(active),todayOrdinal=calendarDay(now)
  let cursor=daySet.has(todayOrdinal)?todayOrdinal:todayOrdinal-1,streak=0,longestStreak=0,run=0,prior:number|undefined
  while(daySet.has(cursor)){streak++;cursor--}
  for(const day of active){run=prior===day-1?run+1:1;longestStreak=Math.max(longestStreak,run);prior=day}
  const trend=[];const date=parseLocalDate(start)!
  while(localDate(date)<=end){const day=localDate(date);trend.push({date:day,minutes:days.get(day)??0});date.setDate(date.getDate()+1)}
  let week=0,month=0,weekDays=0
  for(const [day,minutes] of days){if(day>=weekStart&&day<=weekEnd){week+=minutes;if(minutes>0)weekDays++}if(day>=monthStart&&day<=monthEnd)month+=minutes}
  return {today:days.get(today)??0,week,month,streak,longestStreak,todayPomodoros,weekPomodoros,weekDays,trend,courses:[...byCourse.values()].sort((a,b)=>b.minutes-a.minutes||a.name.localeCompare(b.name,'zh-CN')),rangeMinutes:trend.reduce((sum,day)=>sum+day.minutes,0)}
}
export function filterStudies(records: StudyRecord[], courses: Course[], filters: StudyFilters, now: Date): StudyRecord[] {
  const search=filters.search.trim().toLocaleLowerCase(),courseMap=new Map(courses.map(c=>[c.id,c.name])),bounds=filters.range==='all'?null:studyRange(now,filters.range)
  return records.filter(r=>(filters.courseId==='all'||(filters.courseId==='other'?r.courseId===null:r.courseId===filters.courseId))&&(!bounds||[...distributeMinutes(r)].some(([day,minutes])=>minutes>0&&day>=bounds[0]&&day<=bounds[1]))&&(!search||[r.title,r.note,r.courseNameSnapshot,r.courseId?courseMap.get(r.courseId):''].some(text=>text?.toLocaleLowerCase().includes(search)))).sort((a,b)=>b.date.localeCompare(a.date)||(b.startTime??b.createdAt).localeCompare(a.startTime??a.createdAt)||b.id.localeCompare(a.id))
}
