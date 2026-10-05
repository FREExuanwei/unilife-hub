import { ListTodo, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { useCourses } from '../../courses/useCourses'
import { useTasks } from '../useTasks'
import { selectDefaultSemester } from '../../semester/semesterUtils'
import { sortTasks, tasksForSemester, taskStats, formatDue } from '../taskUtils'
import DueDateBadge from './DueDateBadge'
function useHomeTasks(now:Date) {
  const {data}=useCourses()
  const {tasks,storageError}=useTasks()
  const semester=selectDefaultSemester(data.semesters,now).semester
  const scoped=tasksForSemester(tasks,semester?.id??null)
  return {pending:sortTasks(scoped.filter(item=>item.status === 'pending')),stats:taskStats(scoped,now),storageError}
}
export default function DashboardTasks({now}:{now:Date}) {
  const {pending,stats,storageError}=useHomeTasks(now)
  return <article className="dashboard-card tone-orange" aria-labelledby="dashboard-tasks-title"><div className="card-top"><h3 id="dashboard-tasks-title">待完成任务</h3><span className="card-icon"><ListTodo size={21} strokeWidth={1.7} aria-hidden="true" /></span></div><p className="card-value numeric">{stats.pending}<span className="card-unit">项</span></p><p className="card-description">{storageError?'任务数据暂时无法读取':stats.overdue?`有 ${stats.overdue} 项已逾期，记得处理`:stats.today?`今天有 ${stats.today} 项截止`:pending[0]?`最近：${pending[0].title}`:'没有待完成的作业或待办'}</p><Link className="dashboard-course-link" to="/tasks">查看任务清单<ArrowUpRight size={13} aria-hidden="true" /></Link></article>
}
export function RecentTasks({now}:{now:Date}) {
  const {pending,storageError}=useHomeTasks(now)
  if(!pending.length || storageError)return null
  return <section className="dashboard-recent-tasks" aria-labelledby="recent-tasks-title"><div className="section-heading"><h2 id="recent-tasks-title">近期任务</h2><Link className="section-link" to="/tasks">查看全部<ArrowUpRight size={14} aria-hidden="true" /></Link></div><div className="dashboard-task-list">{pending.slice(0,3).map(task=><Link className="dashboard-task-item" key={task.id} to={`/tasks?task=${encodeURIComponent(task.id)}`}><span><ListTodo size={19} aria-hidden="true" /></span><div className="dashboard-task-copy"><strong>{task.title}</strong><small>{formatDue(task)}</small></div><DueDateBadge task={task} now={now} /><ArrowUpRight size={17} aria-hidden="true" /></Link>)}</div></section>
}
