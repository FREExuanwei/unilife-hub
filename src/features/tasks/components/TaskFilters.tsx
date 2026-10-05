import { Search, X } from 'lucide-react'
import { useId } from 'react'
import type { TaskFilterStatus, TaskFilters as Filters } from '../taskTypes'
interface Props {filters:Filters;onChange:(filters:Filters)=>void;courseName?:string}
const statuses:{value:TaskFilterStatus;label:string}[]=[{value:'all',label:'全部'},{value:'pending',label:'待完成'},{value:'today',label:'今天'},{value:'overdue',label:'已逾期'},{value:'completed',label:'已完成'}]
export default function TaskFilters({filters,onChange,courseName}:Props) {
  const id=useId()
  return <section className="task-filters" aria-label="筛选任务"><div className="task-search-row"><label className="task-search" htmlFor={id}><Search size={19} aria-hidden="true" /><span className="sr-only">搜索任务</span><input id={id} type="search" placeholder="搜索标题、描述或课程名称" value={filters.search} onChange={event=>onChange({...filters,search:event.target.value})} /></label><label className="task-type-filter">类型<select aria-label="任务类型筛选" value={filters.type} onChange={event=>onChange({...filters,type:event.target.value as Filters['type']})}><option value="all">全部类型</option><option value="assignment">作业</option><option value="todo">待办</option></select></label></div><div className="task-status-filters" role="group" aria-label="任务状态筛选">{statuses.map(item=><button key={item.value} type="button" aria-pressed={filters.status === item.value} className={filters.status === item.value?'selected':''} onClick={()=>onChange({...filters,status:item.value})}>{item.label}</button>)}</div>{filters.courseId && <div className="task-course-filter"><span>关联课程：{courseName??'课程已删除'}</span><button type="button" aria-label="清除课程筛选" onClick={()=>onChange({...filters,courseId:null})}><X size={17} aria-hidden="true" />清除</button></div>}</section>
}
