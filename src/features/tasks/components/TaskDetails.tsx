import { Pencil, Trash2, Check, RotateCcw } from 'lucide-react'
import type { Task } from '../taskTypes'
import { formatDue } from '../taskUtils'
import DueDateBadge from './DueDateBadge'
import PriorityBadge from './PriorityBadge'
import { useCourses } from '../../courses/useCourses'
export default function TaskDetails({task,now,onEdit,onDelete,onToggle}:{task:Task;now:Date;onEdit:()=>void;onDelete:()=>void;onToggle:()=>void}) {
  const {data}=useCourses()
  return <div className="task-details"><div className={`task-details-banner ${task.type}`}><span>{task.type === 'assignment'?'课程作业':'普通待办'}</span><h3>{task.title}</h3><div className="task-card-badges"><PriorityBadge priority={task.priority} /><DueDateBadge task={task} now={now} /></div></div>
    <dl><div><dt>所属学期</dt><dd>{data.semesters.find(item=>item.id === task.semesterId)?.name??'全局待办'}</dd></div>{task.type === 'assignment' && <div><dt>关联课程</dt><dd>{data.courses.find(item=>item.id === task.courseId)?.name??'未关联课程'}</dd></div>}<div><dt>截止安排</dt><dd>{formatDue(task)}</dd></div><div><dt>状态</dt><dd>{task.status === 'completed'?'已完成':'待完成'}</dd></div>{task.completedAt && <div><dt>完成时间</dt><dd>{new Date(task.completedAt).toLocaleString('zh-CN')}</dd></div>}</dl>
    {task.associationNote && <p className="task-association-note">{task.associationNote}</p>}<div className="task-description"><h4>描述</h4><p>{task.description||'还没有补充描述。'}</p></div>
    <button type="button" className="secondary-button task-detail-toggle" onClick={onToggle}>{task.status === 'completed'?<RotateCcw size={17} aria-hidden="true" />:<Check size={17} aria-hidden="true" />}{task.status === 'completed'?'恢复未完成':'完成任务'}</button><footer className="form-actions"><button type="button" className="secondary-button course-delete-button" onClick={onDelete}><Trash2 size={17} aria-hidden="true" />删除任务</button><button type="button" className="primary-button" onClick={onEdit}><Pencil size={17} aria-hidden="true" />编辑任务</button></footer>
  </div>
}
