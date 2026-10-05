import type { Course, CourseColor, CourseDraft, CourseErrors, CourseStatus, Weekday } from './courseTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import { calculateCurrentWeek, getOverlappingWeeks, isCourseActiveInWeek } from '../semester/weekUtils.ts'

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
  { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' }, { value: 7, label: '周日' },
]
export const COURSE_COLORS: { value: CourseColor; label: string }[] = [
  { value: 'blue', label: '蓝色' }, { value: 'purple', label: '紫色' }, { value: 'cyan', label: '青色' },
  { value: 'orange', label: '橙色' }, { value: 'pink', label: '粉色' }, { value: 'green', label: '绿色' }, { value: 'red', label: '红色' },
]
export const STATUS_LABELS: Record<CourseStatus, string> = { upcoming: '未开始', ongoing: '正在上课', ended: '已结束' }
export const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
export const timeMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
export const weekdayOf = (date: Date): Weekday => (date.getDay() || 7) as Weekday

export function validateCourse(draft: CourseDraft, totalWeeks = 30): CourseErrors {
  const errors: CourseErrors = {}
  if (!draft.name.trim() || draft.name.trim().length > 80) errors.name = '请输入课程名称（1～80 个字符）。'
  if (!Number.isInteger(draft.weekday) || draft.weekday < 1 || draft.weekday > 7) errors.weekday = '请选择有效的星期。'
  if (!validTime(draft.startTime)) errors.startTime = '请选择有效的开始时间。'
  if (!validTime(draft.endTime)) errors.endTime = '请选择有效的结束时间。'
  if (!errors.startTime && !errors.endTime && draft.endTime <= draft.startTime) errors.endTime = '结束时间必须晚于开始时间。'
  if (!COURSE_COLORS.some(item => item.value === draft.color)) errors.color = '请选择预设课程颜色。'
  if (draft.teacher.length > 80) errors.teacher = '教师姓名最多 80 个字符。'
  if (draft.classroom.length > 100) errors.classroom = '教室信息最多 100 个字符。'
  if (draft.note.length > 1000) errors.note = '备注最多 1000 个字符。'
  if (!['every', 'odd', 'even', 'custom'].includes(draft.weekMode)) errors.weekMode = '请选择有效的上课周次模式。'
  if (!Array.isArray(draft.weeks) || !draft.weeks.length || draft.weeks.some(week => !Number.isInteger(week) || week < 1 || week > totalWeeks) || new Set(draft.weeks).size !== draft.weeks.length) errors.weeks = `请至少选择一个上课周次，范围为第 1～${totalWeeks} 周。`
  else if ((draft.weekMode === 'odd' && draft.weeks.some(week => week % 2 !== 1)) || (draft.weekMode === 'even' && draft.weeks.some(week => week % 2 !== 0))) errors.weeks = '所选周次与单周 / 双周模式不一致。'
  return errors
}
export function sortCourses(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}
export function coursesForDay(courses: Course[], weekday: Weekday): Course[] {
  return sortCourses(courses.filter(course => course.weekday === weekday))
}
export function findConflicts(draft: CourseDraft, courses: Course[], excludingId?: string): Course[] {
  if (!validTime(draft.startTime) || !validTime(draft.endTime) || draft.startTime >= draft.endTime) return []
  return coursesForDay(courses, draft.weekday).filter(item => item.id !== excludingId && draft.startTime < item.endTime && draft.endTime > item.startTime && getOverlappingWeeks(draft.weeks, item.weeks).length > 0)
}
export function courseStatus(course: Course, date: Date): CourseStatus {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes < timeMinutes(course.startTime) ? 'upcoming' : minutes < timeMinutes(course.endTime) ? 'ongoing' : 'ended'
}
export function todaySummary(courses: Course[], date: Date, semester: Semester | null) {
  const week = calculateCurrentWeek(semester, date).week
  const today = coursesForDay(courses.filter(course => isCourseActiveInWeek(course, week)), weekdayOf(date))
  const ongoing = today.filter(course => courseStatus(course, date) === 'ongoing')
  const next = today.find(course => courseStatus(course, date) === 'upcoming')
  return { today, ongoing, next, finished: today.length > 0 && !next && ongoing.length === 0 }
}
