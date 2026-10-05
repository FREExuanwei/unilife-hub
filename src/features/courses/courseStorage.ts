import type { Course, CourseData, CourseLoadResult } from './courseTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import { validateCourse } from './courseUtils.ts'
import { validateSemester } from '../semester/semesterUtils.ts'
import { readTasks } from '../tasks/taskStorage.ts'
import { readExams } from '../exams/examStorage.ts'
import { readStudies } from '../study/studyStorage.ts'
import { readPomodoro } from '../pomodoro/pomodoroStorage.ts'
import { initialPomodoro } from '../pomodoro/pomodoroUtils.ts'
import { pickFields, boundedList } from '../../utils/dataShape.ts'

// Keep the old key; replace only a validated snapshot with one atomic write.
export const COURSE_STORAGE_KEY = 'unilife-courses:v1'
type CourseStorage = Pick<Storage,'getItem'|'setItem'>
export const emptyCourseData = (): CourseData => ({version:5,semesters:[],courses:[],tasks:[],exams:[],studyRecords:[],pomodoro:initialPomodoro()})
function readSemester(value: unknown, legacy=false): Semester {
  if (!value || typeof value !== 'object') throw Error('Invalid semester')
  const item=value as Record<string,unknown>
  if (typeof item.name !== 'string' || typeof item.startDate !== 'string' || typeof item.totalWeeks !== 'number' || (!legacy && (typeof item.id !== 'string' || !item.id))) throw Error('Invalid semester fields')
  const semester={id:legacy?'legacy-semester':item.id,name:item.name,startDate:item.startDate,totalWeeks:item.totalWeeks} as Semester
  if (Object.keys(validateSemester(semester)).length) throw Error('Invalid semester values')
  return semester
}
function readCourse(value: unknown, version: number, semesters: Semester[]): Course {
  if (!value || typeof value !== 'object') throw Error('Invalid course')
  const item=value as Record<string,unknown>
  if (!['id','name','startTime','endTime','teacher','classroom','color','note','createdAt'].every(key=>typeof item[key] === 'string') || typeof item.weekday !== 'number' || !item.id || !Number.isFinite(Date.parse(item.createdAt as string))) throw Error('Invalid course fields')
  const course=pickFields(item,['id','semesterId','name','weekday','startTime','endTime','teacher','classroom','color','note','createdAt','weeks','weekMode','needsWeekMigration']) as unknown as Course
  if (version<3) course.semesterId=semesters[0]?.id??null
  else if (course.semesterId !== null && typeof course.semesterId !== 'string') throw Error('Invalid membership')
  const semester=semesters.find(s=>s.id === course.semesterId)
  if (course.semesterId !== null && !semester) throw Error('Missing semester')
  if (version === 1 && item.weeks === undefined) {course.weeks=[];course.weekMode='every';course.needsWeekMigration=true}
  else {
    if (version === 1 && item.weekMode === undefined) course.weekMode='custom'
    if (!Array.isArray(course.weeks) || !['every','odd','even','custom'].includes(course.weekMode)) throw Error('Invalid weeks')
    if (item.needsWeekMigration !== undefined && (item.needsWeekMigration !== true || semester || course.weeks.length)) throw Error('Invalid migration marker')
  }
  if (!semester && semesters.length) throw Error('Unbound course')
  const errors=validateCourse(course,semester?.totalWeeks??30)
  if (Array.isArray(course.weeks) && course.weeks.length === 0) delete errors.weeks
  if (Object.keys(errors).length) throw Error('Invalid course values')
  return course
}
export function parseCourseData(value: unknown, tolerateModuleErrors = false): CourseLoadResult {
  try {
    if (!value || typeof value !== 'object') throw Error('Invalid data')
    const item=value as Record<string,unknown>
    if (![1,2,3,4,5].includes(item.version as number)) throw Error('Invalid snapshot')
    boundedList(item.courses,10000)
    const version=item.version as number
    let semesters: Semester[]=[]
    if (version === 2 && item.semester !== null) semesters=[readSemester(item.semester,true)]
    if (version >= 3) {
      boundedList(item.semesters,200)
      semesters=item.semesters.map(s=>readSemester(s))
    }
    if (new Set(semesters.map(s=>s.id)).size !== semesters.length) throw Error('Duplicate semesters')
    const courses=item.courses.map(c=>readCourse(c,version,semesters))
    if (new Set(courses.map(c=>c.id)).size !== courses.length) throw Error('Duplicate courses')
    const damaged:string[]=[]
    function module<T>(name:string,read:()=>T,fallback:T):T {
      try { return read() } catch (error) { if (!tolerateModuleErrors) throw error; damaged.push(name); return fallback }
    }
    const tasks=version >= 3 ? module('任务',()=>readTasks(item.tasks,semesters,courses),[]) : []
    const exams=version >= 4 ? module('考试',()=>readExams(item.exams,semesters,courses),[]) : []
    const studyRecords=version >= 5 ? module('学习记录',()=>readStudies(item.studyRecords,semesters,courses),[]) : []
    const pomodoro=version >= 5 ? module('番茄钟',()=>readPomodoro(item.pomodoro,semesters,courses),initialPomodoro()) : initialPomodoro()
    const error=damaged.length ? `无法读取${damaged.join('、')}数据，其余有效数据仍可查看。为保护原始数据，共享数据暂时禁止保存；请恢复有效备份或检查浏览器存储。` : null
    return {data:{version:5,semesters,courses,tasks,exams,studyRecords,pomodoro},error,...(version<5&&!error ? {needsMigration:true} : {})}
  } catch {
    return {data:emptyCourseData(),error:'无法读取学期、课程、任务或考试数据（含学习与专注记录）。可能数据损坏或来自更新版本。请恢复有效备份或检查浏览器存储；现有数据不会被覆盖。'}
  }
}
export function readCourseStorage(storage?: Pick<Storage,'getItem'>): CourseLoadResult {
  try {
    const raw=(storage??window.localStorage).getItem(COURSE_STORAGE_KEY)
    return raw===null ? {data:emptyCourseData(),error:null} : parseCourseData(JSON.parse(raw),true)
  } catch { return {data:emptyCourseData(),error:'无法读取本地数据，请检查浏览器存储；现有数据不会被覆盖。'} }
}
export function writeCourseStorage(data: CourseData, storage?: CourseStorage): string | null {
  try {(storage??window.localStorage).setItem(COURSE_STORAGE_KEY,JSON.stringify(data));return null}
  catch {return '数据保存失败，请先导出备份或检查浏览器存储空间。请保留当前输入后重试。'}
}

