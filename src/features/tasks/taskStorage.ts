import type { Task } from './taskTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import type { Course } from '../courses/courseTypes.ts'
import { validateTask } from './taskUtils.ts'
import { boundedList, pickFields } from '../../utils/dataShape.ts'

// Parsed inside the shared snapshot so membership changes and task protection commit together.
export function readTasks(value: unknown, semesters: Semester[], courses: Course[]): Task[] {
  boundedList(value)
  const tasks=value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw Error('Invalid task')
    const item=raw as Record<string,unknown>
    if (!['id','type','title','description','priority','status','createdAt'].every(key=>typeof item[key] === 'string') || !item.id || !Number.isFinite(Date.parse(item.createdAt as string))) throw Error('Invalid task fields')
    if (!['semesterId','courseId','dueDate','dueTime','completedAt'].every(key=>item[key] === null || typeof item[key] === 'string')) throw Error('Invalid nullable fields')
    if (item.associationNote !== undefined && (typeof item.associationNote !== 'string' || item.associationNote.length > 500)) throw Error('Invalid association note')
    const task=pickFields(item,['id','type','title','description','priority','status','createdAt','semesterId','courseId','dueDate','dueTime','completedAt','associationNote']) as unknown as Task
    if (!['pending','completed'].includes(task.status) || (task.status === 'pending' && task.completedAt !== null) || (task.status === 'completed' && (!task.completedAt || !Number.isFinite(Date.parse(task.completedAt))))) throw Error('Invalid status')
    if (Object.keys(validateTask(task,semesters,courses)).length) throw Error('Invalid task values')
    return task
  })
  if (new Set(tasks.map(task=>task.id)).size !== tasks.length) throw Error('Duplicate task IDs')
  return tasks
}
