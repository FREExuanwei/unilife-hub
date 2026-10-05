import type { Semester, SemesterDraft, SemesterErrors } from './semesterTypes.ts'
import type { Course, CourseData } from '../courses/courseTypes.ts'
import { calendarDay, generateWeeks, parseLocalDate } from './weekUtils.ts'
export function validateSemester(value: SemesterDraft): SemesterErrors {
  const errors: SemesterErrors = {}
  if (!value.name.trim() || value.name.trim().length > 80) errors.name = '请输入学期名称（1～80 个字符）。'
  const start=parseLocalDate(value.startDate)
  if (!start) errors.startDate = '请选择有效的学期开始日期。'
  if (!Number.isInteger(value.totalWeeks) || value.totalWeeks < 1 || value.totalWeeks > 30) errors.totalWeeks = '学期总周数必须为 1～30 的整数。'
  if (start && !errors.totalWeeks && semesterEndDate({...value,id:''}).startsWith('10000')) errors.startDate = '学期结束日期超出可支持的日期范围。'
  return errors
}
export function semesterRange(semester: Semester): [number,number] {
  const start=parseLocalDate(semester.startDate)!
  const first=calendarDay(start)
  return [first, first-((start.getDay()+6)%7)+semester.totalWeeks*7-1]
}
export function semesterEndDate(semester: Semester): string {
  const end=new Date(semesterRange(semester)[1]*86400000)
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth()+1).padStart(2,'0')}-${String(end.getUTCDate()).padStart(2,'0')}`
}
export function findSemesterOverlaps(draft: Semester, semesters: Semester[]): Semester[] {
  if (Object.keys(validateSemester(draft)).length) return []
  const [a,b]=semesterRange(draft)
  return semesters.filter(item=>item.id !== draft.id && (()=>{const [c,d]=semesterRange(item);return a<=d && b>=c})())
}
export function selectDefaultSemester(semesters: Semester[], now: Date): {semester:Semester|null;isWithin:boolean} {
  const day=calendarDay(now)
  const sorted=[...semesters].sort((a,b)=>b.startDate.localeCompare(a.startDate)||a.id.localeCompare(b.id))
  const active=sorted.find(item=>{const [start,end]=semesterRange(item);return day>=start && day<=end})
  if (active) return {semester:active,isWithin:true}
  const distance=(item:Semester)=>{const [start,end]=semesterRange(item);return day<start?start-day:day-end}
  const nearest=sorted.sort((a,b)=>distance(a)-distance(b)||b.startDate.localeCompare(a.startDate))[0]
  return {semester:nearest??null,isWithin:false}
}
export function affectedCourses(courses: Course[], totalWeeks: number): Course[] {
  return courses.filter(course => course.weeks.some(week => week > totalWeeks))
}
export function applySemester(data: CourseData, semester: Semester): CourseData {
  const first=data.semesters.length === 0
  const normalized={...semester,name:semester.name.trim()}
  return {...data,semesters:data.semesters.some(item=>item.id === semester.id) ? data.semesters.map(item=>item.id === semester.id ? normalized : item) : [...data.semesters,normalized],
    courses:data.courses.map(course => {
      if (course.semesterId !== semester.id && !(first && course.semesterId === null)) return course
      const {needsWeekMigration:pending,...values}=course
      if (pending) return {...values,semesterId:semester.id,weeks:generateWeeks('every',1,semester.totalWeeks,semester.totalWeeks),weekMode:'every'}
      return {...values,semesterId:semester.id,weeks:course.weeks.filter(week=>week<=semester.totalWeeks)}
    })}
}

