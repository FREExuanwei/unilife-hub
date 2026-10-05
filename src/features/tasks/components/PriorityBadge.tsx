import { Flag } from 'lucide-react'
import type { TaskPriority } from '../taskTypes'
import { PRIORITIES } from '../taskUtils'
export default function PriorityBadge({priority}:{priority:TaskPriority}) {
  return <span className={`task-badge priority-${priority}`}><Flag size={12} aria-hidden="true" />{PRIORITIES.find(item=>item.value === priority)?.label}优先级</span>
}
