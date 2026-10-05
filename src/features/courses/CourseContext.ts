import { createContext } from 'react'
import type { CourseData, CourseDraft } from './courseTypes'
import type { SemesterDraft } from '../semester/semesterTypes'
import type { TaskDraft } from '../tasks/taskTypes'
import type { ExamDraft } from '../exams/examTypes'
import type { StudyDraft } from '../study/studyTypes'
import type { PomodoroAction } from '../pomodoro/pomodoroTypes'
interface CourseContextValue {
  data: CourseData
  storageError: string | null
  saveCourse: (draft: CourseDraft, id?: string, allowConflict?: boolean) => Promise<string | null>
  deleteCourse: (id: string) => Promise<string | null>
  saveSemester: (draft: SemesterDraft, id?: string, confirmTrim?: boolean) => Promise<string | null>
  deleteSemester: (id: string, targetSemesterId?: string) => Promise<string | null>
  saveTask: (draft: TaskDraft, id?: string) => Promise<string | null>
  deleteTask: (id: string) => Promise<string | null>
  toggleTask: (id: string) => Promise<string | null>
  saveExam: (draft: ExamDraft, id?: string, confirmOutside?: boolean) => Promise<string | null>
  deleteExam: (id: string) => Promise<string | null>
  saveStudy: (draft: StudyDraft, id?: string) => Promise<string | null>
  deleteStudy: (id: string) => Promise<string | null>
  timerAction: (action: PomodoroAction) => Promise<string | null>
}
export const CourseContext = createContext<CourseContextValue | null>(null)

