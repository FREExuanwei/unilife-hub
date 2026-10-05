import { Clock3, CircleCheck } from 'lucide-react'
import type { Task } from '../taskTypes'
import { dueLabel, formatDue, isDueToday, isOverdue } from '../taskUtils'
export default function DueDateBadge({task,now}:{task:Task;now:Date}) {
  const Icon=task.status === 'completed' ? CircleCheck : Clock3
  return <span title={formatDue(task)} className={`task-badge due-badge ${isOverdue(task,now)?'overdue':isDueToday(task,now)?'due-today':''}`}><Icon size={13} aria-hidden="true" />{dueLabel(task,now)}</span>
}
