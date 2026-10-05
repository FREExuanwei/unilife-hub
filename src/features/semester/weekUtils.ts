import type { Semester, SemesterWeek } from './semesterTypes.ts'
import type { Course, CourseWeekMode } from '../courses/courseTypes.ts'

// Calendar-day ordinals avoid DST-length days and UTC parsing of local date strings.
export function calendarDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
}
export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900 || year > 9999) return null
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}
export function calculateCurrentWeek(semester: Semester | null, now: Date): SemesterWeek {
  if (!semester) return { status: 'unset', week: null }
  const start = parseLocalDate(semester.startDate)
  if (!start) return { status: 'unset', week: null }
  const currentDay = calendarDay(now)
  if (currentDay < calendarDay(start)) return { status: 'before', week: null }
  const monday = calendarDay(start) - ((start.getDay() + 6) % 7)
  const week = Math.floor((currentDay - monday) / 7) + 1
  return week > semester.totalWeeks ? { status: 'after', week: null } : { status: 'active', week }
}
export function weekStatusLabel(state: SemesterWeek): string {
  return state.status === 'active' ? `当前第 ${state.week} 周` : state.status === 'before' ? '本学期尚未开始' : state.status === 'after' ? '本学期已结束' : '尚未设置学期'
}
export function generateWeeks(mode: CourseWeekMode, start: number, end: number, total: number): number[] {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > total || start > end || mode === 'custom') return []
  return Array.from({ length: end - start + 1 }, (_, i) => start + i).filter(week => mode === 'every' || (mode === 'odd' ? week % 2 === 1 : week % 2 === 0))
}
export const isCourseActiveInWeek = (course: Course, week: number | null) => week !== null && course.weeks.includes(week)
export function getOverlappingWeeks(a: number[], b: number[]): number[] {
  const other = new Set(b)
  return [...new Set(a)].filter(week => other.has(week)).sort((x, y) => x - y)
}
export function formatWeeks(weeks: number[]): string {
  const values = [...new Set(weeks)].sort((a, b) => a - b)
  if (!values.length) return '待安排周次'
  if (values.length === 1) return `第 ${values[0]} 周`
  const first = values[0], last = values[values.length - 1]
  if (values.every((week, index) => week === first + index)) return `第 ${first}～${last} 周`
  if (values.length >= 3 && values.every((week, index) => week === first + index * 2)) return `第 ${first}～${last} 周 · ${first % 2 ? '单周' : '双周'}`
  const groups: string[] = []
  for (let i = 0; i < values.length; i++) {
    const begin = values[i]
    while (i + 1 < values.length && values[i + 1] === values[i] + 1) i++
    groups.push(values[i] === begin ? String(begin) : `${begin}～${values[i]}`)
  }
  return `第 ${values.length <= 6 ? values.join('、') : groups.join('、')} 周`
}
