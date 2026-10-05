import { ListTodo, Clock3, TriangleAlert, CircleCheck } from 'lucide-react'
import type { Task } from '../taskTypes'
import { taskStats } from '../taskUtils'
export default function TaskStats({tasks,now}:{tasks:Task[];now:Date}) {
  const stats=taskStats(tasks,now)
  const items=[{key:'pending' as const,label:'待完成',icon:ListTodo,tone:'purple'},{key:'today' as const,label:'今天截止',icon:Clock3,tone:'orange'},{key:'overdue' as const,label:'已逾期',icon:TriangleAlert,tone:'danger'},{key:'completed' as const,label:'已完成',icon:CircleCheck,tone:'cyan'}]
  return <section className="task-stats" aria-label="任务统计">{items.map(({key,label,icon:Icon,tone})=><article key={key} className={`task-stat tone-${tone}`}><div><span>{label}</span><strong>{stats[key]}<small>项</small></strong></div><span className="task-stat-icon"><Icon size={23} aria-hidden="true" /></span></article>)}</section>
}
