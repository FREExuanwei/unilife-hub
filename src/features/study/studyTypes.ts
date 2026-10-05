export type StudySource = 'manual' | 'pomodoro'
export type StudyRange = 'all' | 'week' | 'month'
export interface TimeSegment { start: number; end: number }
export interface StudyRecord {
  id: string
  semesterId: string | null
  courseId: string | null
  courseNameSnapshot: string
  title: string
  note: string
  date: string
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  source: StudySource
  createdAt: string
  updatedAt: string
  segments?: TimeSegment[]
  pomodoroCompleted?: boolean
}
export type StudyDraft = Omit<StudyRecord, 'id' | 'createdAt' | 'updatedAt'>
export type StudyErrors = Partial<Record<keyof StudyDraft, string>>
export interface ManualStudyInput { title: string; note: string; date: string; mode: 'duration' | 'range'; minutes: number; start: string; end: string; courseId: string | null }
export interface StudyFilters { range: StudyRange; courseId: string; search: string }
export interface DailyStudy { date: string; minutes: number }
export interface CourseStudy { id: string | null; name: string; semesterId: string | null; minutes: number }
export interface StudyStats {
  today: number; week: number; month: number; streak: number; longestStreak: number
  todayPomodoros: number; weekPomodoros: number; weekDays: number
  trend: DailyStudy[]; courses: CourseStudy[]; rangeMinutes: number
}
