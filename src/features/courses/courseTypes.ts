import type { Semester } from '../semester/semesterTypes'
import type { Task } from '../tasks/taskTypes'
import type { Exam } from '../exams/examTypes'
import type { StudyRecord } from '../study/studyTypes'
import type { PomodoroData } from '../pomodoro/pomodoroTypes'

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type CourseColor = 'blue' | 'purple' | 'cyan' | 'orange' | 'pink' | 'green' | 'red'
export type CourseWeekMode = 'every' | 'odd' | 'even' | 'custom'
export interface Course {
  id: string
  semesterId: string | null
  name: string
  weekday: Weekday
  startTime: string
  endTime: string
  teacher: string
  classroom: string
  color: CourseColor
  note: string
  createdAt: string
  weeks: number[]
  weekMode: CourseWeekMode
  needsWeekMigration?: true
}
export type CourseDraft = Omit<Course, 'id' | 'createdAt' | 'needsWeekMigration'>
export type CourseErrors = Partial<Record<keyof CourseDraft, string>>
export type CourseStatus = 'upcoming' | 'ongoing' | 'ended'
export interface CourseData { version: 5; semesters: Semester[]; courses: Course[]; tasks: Task[]; exams: Exam[]; studyRecords: StudyRecord[]; pomodoro: PomodoroData }
export interface CourseLoadResult { data: CourseData; error: string | null; needsMigration?: boolean }
