export type ExamType = 'midterm' | 'final' | 'quiz' | 'resit' | 'qualification' | 'other'
export type ExamStatus = 'upcoming' | 'today' | 'ongoing' | 'ended'
export type ExamUrgency = 'calm' | 'soon' | 'urgent' | 'today' | 'ended'
export interface Exam {
  id: string
  semesterId: string
  courseId: string | null
  title: string
  examType: ExamType
  examDate: string
  startTime: string | null
  endTime: string | null
  location: string
  seat: string
  note: string
  createdAt: string
  updatedAt: string
  associationNote?: string
}
export type ExamDraft = Omit<Exam, 'id' | 'createdAt' | 'updatedAt' | 'associationNote'>
export type ExamErrors = Partial<Record<keyof ExamDraft, string>>
export interface ExamFilters {
  semesterId: string | null
  status: 'all' | 'upcoming' | 'today' | 'week' | 'ended'
  type: ExamType | 'all'
  search: string
}
