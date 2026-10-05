import type { Semester } from '../semester/semesterTypes.ts'
import type { Course } from '../courses/courseTypes.ts'
import type { StudyRecord } from './studyTypes.ts'
import { validTimestamp, validateStudy } from './studyUtils.ts'
import { boundedList, pickFields } from '../../utils/dataShape.ts'
export function readStudies(value: unknown, semesters: Semester[], courses: Course[]): StudyRecord[] {
  boundedList(value)
  const records=value.map((raw:unknown)=>{
    if(!raw||typeof raw!=='object')throw Error('Invalid study record')
    const item=raw as Record<string,unknown>
    if(!['id','title','note','date','courseNameSnapshot','createdAt','updatedAt'].every(key=>typeof item[key]==='string')||!item.id||typeof item.durationMinutes!=='number'||!['manual','pomodoro'].includes(item.source as string)||!validTimestamp(item.createdAt as string)||!validTimestamp(item.updatedAt as string))throw Error('Invalid study fields')
    for(const key of ['semesterId','courseId','startTime','endTime'])if(item[key]!==null&&typeof item[key]!=='string')throw Error('Invalid nullable study field')
    if(item.pomodoroCompleted!==undefined&&typeof item.pomodoroCompleted!=='boolean')throw Error('Invalid completed flag')
    if(item.segments!==undefined&&(!Array.isArray(item.segments)||item.segments.some((s:unknown)=>!s||typeof s!=='object'||typeof(s as Record<string,unknown>).start!=='number'||typeof(s as Record<string,unknown>).end!=='number')))throw Error('Invalid segments')
    const record=pickFields(item,['id','semesterId','courseId','courseNameSnapshot','title','note','date','startTime','endTime','durationMinutes','source','createdAt','updatedAt','pomodoroCompleted']) as unknown as StudyRecord
    if(Array.isArray(item.segments))record.segments=item.segments.map(segment=>pickFields(segment as Record<string,unknown>,['start','end'])) as unknown as StudyRecord['segments']
    if(Object.keys(validateStudy(record,semesters,courses)).length)throw Error('Invalid study values')
    return record
  })
  if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('Duplicate studies')
  return records
}
