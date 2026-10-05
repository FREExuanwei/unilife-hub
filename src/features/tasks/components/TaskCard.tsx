import { Check, RotateCcw, Pencil, Trash2, BookOpen, ArrowUpRight, ListTodo } from 'lucide-react'
import type { Task } from '../taskTypes'
import PriorityBadge from './PriorityBadge'
import DueDateBadge from './DueDateBadge'
import { formatDue, isOverdue } from '../taskUtils'
interface Props {task:Task;courseName?:string;now:Date;onOpen:()=>void;onEdit:()=>void;onDelete:()=>void;onToggle:()=>void}
export default function TaskCard({task,courseName,now,onOpen,onEdit,onDelete,onToggle}:Props) {
  const done=task.status === 'completed'
  const Icon=task.type === 'assignment' ? BookOpen : ListTodo
  return <article className={`task-card ${task.type} ${done?'completed':''} ${isOverdue(task,now)?'overdue':''}`}>
    <button type="button" className="task-card-main" aria-label={`查看任务 ${task.title}`} onClick={onOpen}><div className="task-card-top"><span className="task-type"><Icon size={15} aria-hidden="true" />{task.type === 'assignment'?'作业':'待办'}{task.semesterId === null && <small>全局</small>}</span><ArrowUpRight size={17} aria-hidden="true" /></div><h3>{task.title}</h3>{task.description && <p className="task-excerpt">{task.description}</p>}<div className="task-meta">{courseName && <span><BookOpen size={13} aria-hidden="true" />{courseName}</span>}<span>{formatDue(task)}</span></div>{task.associationNote && <p className="task-association-note">{task.associationNote}</p>}</button>
    <div className="task-card-badges"><PriorityBadge priority={task.priority} /><DueDateBadge task={task} now={now} />{!done && !isOverdue(task,now) && <span className="task-status-text">待完成</span>}</div>
    <footer className="task-card-actions"><button type="button" className={`task-complete ${done?'is-done':''}`} onClick={onToggle} aria-label={`${done?'恢复':'完成'}任务 ${task.title}`}>{done?<RotateCcw size={17} aria-hidden="true" />:<Check size={17} aria-hidden="true" />}{done?'恢复未完成':'完成'}</button><div><button type="button" className="icon-button" aria-label={`编辑任务 ${task.title}`} onClick={onEdit}><Pencil size={17} aria-hidden="true" /></button><button type="button" className="icon-button" aria-label={`删除任务 ${task.title}`} onClick={onDelete}><Trash2 size={17} aria-hidden="true" /></button></div></footer>
  </article>
}
