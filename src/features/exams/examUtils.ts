import type { Exam, ExamDraft, ExamErrors, ExamFilters, ExamStatus, ExamType, ExamUrgency } from './examTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import type { Course } from '../courses/courseTypes.ts'
import { validTime } from '../courses/courseUtils.ts'
import { calendarDay, parseLocalDate } from '../semester/weekUtils.ts'
import { semesterRange } from '../semester/semesterUtils.ts'

export const EXAM_TYPES: {value: ExamType; label: string}[] = [
  {value:'midterm',label:'期中考试'}, {value:'final',label:'期末考试'},
  {value:'quiz',label:'测验'}, {value:'resit',label:'补考'},
  {value:'qualification',label:'资格考试'}, {value:'other',label:'其他'},
]
export function validateExam(draft: ExamDraft, semesters: Semester[], courses: Course[]): ExamErrors {
  const errors: ExamErrors = {}
  if (!draft.title.trim() || draft.title.trim().length > 120) errors.title = '请输入考试名称（1～120 个字符）。'
  if (!EXAM_TYPES.some(item=>item.value === draft.examType)) errors.examType = '请选择有效的考试类型。'
  if (!semesters.some(item=>item.id === draft.semesterId)) errors.semesterId = '请选择有效的所属学期。'
  if (draft.courseId !== null && !courses.some(item=>item.id === draft.courseId && item.semesterId === draft.semesterId)) errors.courseId = '请选择该学期中的课程，或取消关联。'
  if (!parseLocalDate(draft.examDate)) errors.examDate = '请选择有效的考试日期。'
  if (draft.startTime !== null && !validTime(draft.startTime)) errors.startTime = '请选择有效的开始时间。'
  if (draft.endTime !== null && !validTime(draft.endTime)) errors.endTime = '请选择有效的结束时间。'
  if (!errors.startTime && !errors.endTime && draft.startTime && draft.endTime && draft.endTime <= draft.startTime) errors.endTime = '结束时间必须晚于开始时间。'
  if (draft.location.length > 200) errors.location = '考试地点最多 200 个字符。'
  if (draft.seat.length > 80) errors.seat = '座位号最多 80 个字符。'
  if (draft.note.length > 3000) errors.note = '备注最多 3000 个字符。'
  return errors
}
export function isExamOutsideSemester(draft: Pick<ExamDraft,'examDate'>, semester: Semester): boolean {
  const date = parseLocalDate(draft.examDate)
  if (!date) return false
  const day = calendarDay(date)
  const [start,end] = semesterRange(semester)
  return day < start || day > end
}
function atTime(exam: Pick<Exam,'examDate'>, time: string): number {
  const date = parseLocalDate(exam.examDate)
  if (!date) return NaN
  const [hours,minutes] = time.split(':').map(Number)
  date.setHours(hours,minutes,0,0)
  return date.getTime()
}
export function examDaysAway(exam: Pick<Exam,'examDate'>, now: Date): number {
  const date = parseLocalDate(exam.examDate)
  return date ? calendarDay(date) - calendarDay(now) : NaN
}
export function getExamStatus(exam: Pick<Exam,'examDate'|'startTime'|'endTime'>, now: Date): ExamStatus {
  const days = examDaysAway(exam,now)
  if (days < 0 || (days === 0 && exam.endTime && now.getTime() >= atTime(exam,exam.endTime))) return 'ended'
  if (days > 0) return 'upcoming'
  if (exam.startTime && exam.endTime && now.getTime() >= atTime(exam,exam.startTime)) return 'ongoing'
  return 'today'
}
export function getExamCountdown(exam: Pick<Exam,'examDate'|'startTime'|'endTime'>, now: Date): string {
  const status = getExamStatus(exam,now)
  if (status === 'ended') return '已结束'
  if (status === 'ongoing') return '考试进行中'
  const days = examDaysAway(exam,now)
  if (days === 1) return '明天考试'
  if (days > 1) return `还有 ${days} 天`
  if (exam.startTime && now.getTime() < atTime(exam,exam.startTime)) {
    const minutes = Math.ceil((atTime(exam,exam.startTime) - now.getTime()) / 60000)
    const hours = Math.floor(minutes / 60)
    return hours ? `还有 ${hours} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}` : `还有 ${minutes} 分钟`
  }
  return '今天考试'
}
export function getExamUrgency(exam: Pick<Exam,'examDate'|'startTime'|'endTime'>, now: Date): ExamUrgency {
  const status = getExamStatus(exam,now)
  if (status === 'ended') return 'ended'
  const days = examDaysAway(exam,now)
  return days === 0 ? 'today' : days <= 2 ? 'urgent' : days <= 7 ? 'soon' : 'calm'
}
export function formatExamDate(exam: Pick<Exam,'examDate'>): string {
  const date = parseLocalDate(exam.examDate)
  return date ? `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日` : '日期无效'
}
export function formatExamTime(exam: Pick<Exam,'startTime'|'endTime'>): string {
  return exam.startTime && exam.endTime ? `${exam.startTime}–${exam.endTime}` : exam.startTime ? `${exam.startTime} 开始` : exam.endTime ? `${exam.endTime} 结束` : '未设置具体时间'
}
function examOrder(a: Exam, b: Exam): number {
  return a.examDate.localeCompare(b.examDate) || (a.startTime ?? a.endTime ?? '00:00').localeCompare(b.startTime ?? b.endTime ?? '00:00') || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
}
export const sortUpcomingExams = (exams: Exam[]): Exam[] => [...exams].sort(examOrder)
export const sortEndedExams = (exams: Exam[]): Exam[] => [...exams].sort((a,b)=>examOrder(b,a))
export function nextExam(exams: Exam[], now: Date): Exam | undefined {
  return sortUpcomingExams(exams.filter(exam=>getExamStatus(exam,now) !== 'ended'))[0]
}
export function filterExams(exams: Exam[], filters: ExamFilters, courses: Course[], now: Date): Exam[] {
  const query = filters.search.trim().toLocaleLowerCase()
  const names = new Map(courses.map(course=>[course.id,course.name]))
  const matching = exams.filter(exam=> {
    const status = getExamStatus(exam,now)
    const days = examDaysAway(exam,now)
    return exam.semesterId === filters.semesterId &&
      (filters.type === 'all' || exam.examType === filters.type) &&
      (filters.status === 'all' || (filters.status === 'ended' ? status === 'ended' : status !== 'ended' && (filters.status === 'upcoming' || (filters.status === 'today' ? days === 0 : days >= 0 && days <= 7)))) &&
      (!query || [exam.title,exam.courseId ? names.get(exam.courseId) ?? '' : '',exam.location,exam.note,exam.associationNote ?? ''].some(text=>text.toLocaleLowerCase().includes(query)))
  })
  return [...sortUpcomingExams(matching.filter(exam=>getExamStatus(exam,now) !== 'ended')), ...sortEndedExams(matching.filter(exam=>getExamStatus(exam,now) === 'ended'))]
}
export function examStats(exams: Exam[], now: Date): {upcoming: number; withinWeek: number; ended: number} {
  const upcoming = exams.filter(exam=>getExamStatus(exam,now) !== 'ended')
  return {upcoming:upcoming.length,withinWeek:upcoming.filter(exam=>examDaysAway(exam,now) >= 0 && examDaysAway(exam,now) <= 7).length,ended:exams.length-upcoming.length}
}
