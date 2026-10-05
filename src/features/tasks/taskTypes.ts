export type TaskType = 'assignment' | 'todo'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'completed'
export interface Task {
  id: string
  type: TaskType
  title: string
  description: string
  semesterId: string | null
  courseId: string | null
  dueDate: string | null
  dueTime: string | null
  priority: TaskPriority
  status: TaskStatus
  createdAt: string
  completedAt: string | null
  associationNote?: string
}
export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'associationNote'>
export type TaskErrors = Partial<Record<keyof TaskDraft, string>>
export type TaskFilterStatus = 'all' | 'pending' | 'today' | 'overdue' | 'completed'
export interface TaskFilters { semesterId: string | null; status: TaskFilterStatus; type: TaskType | 'all'; search: string; courseId: string | null }
