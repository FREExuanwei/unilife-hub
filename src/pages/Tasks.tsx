import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ListTodo, Plus, Search, Sparkles } from 'lucide-react'
import { useCurrentDate } from '../hooks/useCurrentDate'
import { useCourses } from '../features/courses/useCourses'
import { useTasks } from '../features/tasks/useTasks'
import { useViewedSemester } from '../features/semester/useViewedSemester'
import SemesterSelector from '../features/semester/components/SemesterSelector'
import TaskCard from '../features/tasks/components/TaskCard'
import TaskModal from '../features/tasks/components/TaskModal'
import type { TaskDialog } from '../features/tasks/components/TaskModal'
import TaskStats from '../features/tasks/components/TaskStats'
import TaskFilters from '../features/tasks/components/TaskFilters'
import type { TaskFilters as Filters } from '../features/tasks/taskTypes'
import { filterTasks, tasksForSemester } from '../features/tasks/taskUtils'

export default function Tasks() {
  const now=useCurrentDate()
  const {data}=useCourses()
  const {tasks,storageError,toggleTask}=useTasks()
  const [params,setParams]=useSearchParams()
  const initialCourse=data.courses.find(item=>item.id === params.get('course'))
  const {semester,automatic,onSelect}=useViewedSemester(now,initialCourse?.semesterId)
  const [status,setStatus]=useState<Filters['status']>('all')
  const [type,setType]=useState<Filters['type']>('all')
  const [search,setSearch]=useState('')
  const [courseId,setCourseId]=useState<string|null>(initialCourse?.id??null)
  const [dialog,setDialog]=useState<TaskDialog|null>(params.get('action') === 'add'?{mode:'add'}:params.get('task')?{mode:'details',id:params.get('task')!}:null)
  const [feedback,setFeedback]=useState('')
  useEffect(()=>{
    if(params.get('action') === 'add') {setDialog({mode:'add'});const next=new URLSearchParams(params);next.delete('action');setParams(next,{replace:true})}
    else if(params.has('task')) {setDialog({mode:'details',id:params.get('task')!});const next=new URLSearchParams(params);next.delete('task');setParams(next,{replace:true})}
  },[params,setParams])
  const filters:Filters={semesterId:semester?.id??null,status,type,search,courseId}
  const visible=filterTasks(tasks,filters,data.courses,now)
  const scoped=tasksForSemester(tasks,semester?.id??null)
  const courseName=data.courses.find(item=>item.id === courseId)?.name
  function filterChange(next:Filters) {setStatus(next.status);setType(next.type);setSearch(next.search);setCourseId(next.courseId);if(next.courseId === null && params.has('course')){const query=new URLSearchParams(params);query.delete('course');setParams(query,{replace:true})}}
  function selectSemester(id:string) {onSelect(id);setCourseId(null);setDialog(null);if(params.has('course')){const query=new URLSearchParams(params);query.delete('course');setParams(query,{replace:true})}}
  return <div className="tasks-page"><div className="schedule-heading"><div><p className="eyebrow">ONE SMALL STEP AT A TIME</p><h1>作业与待办 <span className="schedule-title-icon"><ListTodo size={24} aria-hidden="true" /></span></h1><p>把作业和生活小事放在一起，留更多时间给自己。</p></div><button type="button" className="primary-button" onClick={()=>setDialog({mode:'add'})}><Plus size={18} aria-hidden="true" />添加任务</button></div>
    {storageError && <p className="storage-notice" role="alert">{storageError}</p>}<p className="bookmark-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
    <SemesterSelector semester={semester} onSelect={selectSemester} isWithin={automatic.isWithin} onFeedback={setFeedback} />
    <TaskStats tasks={scoped} now={now} /><TaskFilters filters={filters} onChange={filterChange} courseName={courseName} />
    <div className="task-list-heading"><h2>任务清单 <span>{visible.length}</span></h2><p><Sparkles size={14} aria-hidden="true" />先处理临近截止的事，已完成任务放在最后</p></div>
    {visible.length ? <section className="task-grid" aria-label="任务列表">{visible.map(task=><TaskCard key={task.id} task={task} courseName={data.courses.find(item=>item.id === task.courseId)?.name} now={now} onOpen={()=>setDialog({mode:'details',id:task.id})} onEdit={()=>setDialog({mode:'edit',id:task.id})} onDelete={()=>setDialog({mode:'delete',id:task.id})} onToggle={async ()=>{const error=await toggleTask(task.id);setFeedback(error??(task.status === 'completed'?'任务已恢复为待完成':'任务已完成'))}} />)}</section>
      : <section className="task-empty"><span><Search size={34} aria-hidden="true" /></span><h3>{scoped.length?'没有符合条件的任务':'给想做的事，一个位置。'}</h3><p>{scoped.length?'试试调整筛选或搜索关键词。':'从一项作业、一个生活待办开始。全局待办会在所有学期显示。'}</p><button type="button" className="primary-button" onClick={()=>{if(scoped.length){filterChange({...filters,status:'all',type:'all',search:'',courseId:null})}else setDialog({mode:'add'})}}>{scoped.length?'清除筛选':'添加第一个任务'}</button></section>}
    <p className="schedule-footnote">任务保存在当前浏览器中 · 全局待办始终显示 · 截止状态自动更新</p>
    <TaskModal dialog={dialog} semesterId={semester?.id??null} now={now} onDialog={setDialog} onFeedback={setFeedback} />
  </div>
}

