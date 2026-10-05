import type { Task, TaskDraft, TaskErrors, TaskFilters, TaskPriority } from './taskTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import type { Course } from '../courses/courseTypes.ts'
import { validTime } from '../courses/courseUtils.ts'
import { calendarDay, parseLocalDate } from '../semester/weekUtils.ts'

export const PRIORITIES: {value:TaskPriority;label:string}[] = [{value:'low',label:'低'},{value:'normal',label:'普通'},{value:'high',label:'高'},{value:'urgent',label:'紧急'}]
export function validateTask(draft: TaskDraft, semesters: Semester[], courses: Course[]): TaskErrors {
  const errors: TaskErrors = {}
  if (!draft.title.trim() || draft.title.trim().length > 120) errors.title = '请输入任务标题（1～120 个字符）。'
  if (draft.description.length > 3000) errors.description = '描述最多 3000 个字符。'
  if (!['assignment','todo'].includes(draft.type)) errors.type = '请选择有效的任务类型。'
  if (!PRIORITIES.some(item=>item.value === draft.priority)) errors.priority = '请选择有效的优先级。'
  if (draft.semesterId !== null && !semesters.some(item=>item.id === draft.semesterId)) errors.semesterId = '所选学期已不存在，请重新选择。'
  if (draft.type === 'assignment' && !draft.semesterId) errors.semesterId = '作业需要选择所属学期，可不关联课程。'
  if (draft.courseId !== null && (draft.type !== 'assignment' || !courses.some(item=>item.id === draft.courseId && item.semesterId === draft.semesterId))) errors.courseId = '请选择该学期的课程，或取消课程关联。'
  if (draft.dueDate !== null && !parseLocalDate(draft.dueDate)) errors.dueDate = '请选择有效的截止日期。'
  if (draft.dueTime !== null && (!draft.dueDate || !validTime(draft.dueTime))) errors.dueTime = draft.dueDate ? '请选择有效的截止时间。' : '填写截止时间时，需要同时填写截止日期。'
  return errors
}
export function dueTimestamp(task: Pick<Task,'dueDate'|'dueTime'>): number {
  if (!task.dueDate) return Infinity
  const date = parseLocalDate(task.dueDate)
  if (!date) return Infinity
  if (task.dueTime) { const [h,m]=task.dueTime.split(':').map(Number); date.setHours(h,m,0,0) }
  else date.setHours(23,59,59,999)
  return date.getTime()
}
export const isOverdue = (task: Task, now: Date) => task.status === 'pending' && now.getTime() > dueTimestamp(task)
export const isDueToday = (task: Task, now: Date) => task.status === 'pending' && Boolean(task.dueDate && calendarDay(parseLocalDate(task.dueDate)!) === calendarDay(now))
export function dueLabel(task: Task, now: Date): string {
  if (task.status === 'completed') return '已完成'
  if (!task.dueDate) return '无截止日期'
  const days = calendarDay(parseLocalDate(task.dueDate)!) - calendarDay(now)
  if (isOverdue(task,now)) return days < 0 ? `已逾期 ${-days} 天` : '已逾期'
  return days === 0 ? '今天截止' : days === 1 ? '明天截止' : days <= 3 && days > 0 ? `还有 ${days} 天` : `${task.dueDate.replaceAll('-','/')} 截止`
}
export function formatDue(task: Task): string {
  if (!task.dueDate) return '未设置截止日期'
  const date=parseLocalDate(task.dueDate)!
  return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日${task.dueTime ? ` ${task.dueTime}` : ''} 截止`
}
const priorityRank: Record<TaskPriority,number> = {low:0,normal:1,high:2,urgent:3}
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a,b)=> {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    if (a.status === 'completed') return (b.completedAt ?? '').localeCompare(a.completedAt ?? '') || a.id.localeCompare(b.id)
    const deadlineA=dueTimestamp(a),deadlineB=dueTimestamp(b)
    return (deadlineA === deadlineB ? 0 : deadlineA < deadlineB ? -1 : 1) || priorityRank[b.priority]-priorityRank[a.priority] || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  })
}
export const tasksForSemester = (tasks: Task[], semesterId: string | null) => tasks.filter(task=>task.semesterId === null || task.semesterId === semesterId)
export function filterTasks(tasks: Task[], filters: TaskFilters, courses: Course[], now: Date): Task[] {
  const query=filters.search.trim().toLocaleLowerCase()
  const courseNames = new Map(courses.map(course=>[course.id,course.name]))
  return sortTasks(tasksForSemester(tasks,filters.semesterId).filter(task=>
    (filters.type === 'all' || task.type === filters.type) &&
    (!filters.courseId || task.courseId === filters.courseId) &&
    (filters.status === 'all' || (filters.status === 'overdue' ? isOverdue(task,now) : filters.status === 'today' ? isDueToday(task,now) : task.status === filters.status)) &&
    (!query || [task.title,task.description,task.courseId ? courseNames.get(task.courseId) ?? '' : '',task.associationNote ?? ''].some(text=>text.toLocaleLowerCase().includes(query)))
  ))
}
export function taskStats(tasks: Task[], now: Date) {
  return {pending:tasks.filter(task=>task.status === 'pending').length,today:tasks.filter(task=>isDueToday(task,now)).length,overdue:tasks.filter(task=>isOverdue(task,now)).length,completed:tasks.filter(task=>task.status === 'completed').length}
}
