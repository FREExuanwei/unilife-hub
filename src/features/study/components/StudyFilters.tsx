import { useId } from 'react'
import { Search } from 'lucide-react'
import type { StudyFilters as Filters } from '../studyTypes'
import type { Course } from '../../courses/courseTypes'
import type { Semester } from '../../semester/semesterTypes'
export default function StudyFilters({filters,onChange,courses,semesters}:{filters:Filters;onChange:(filters:Filters)=>void;courses:Course[];semesters:Semester[]}){
  const id=useId()
  return <div className="study-filters"><div className="study-range-toggle" aria-label="学习记录范围">{(['all','week','month'] as const).map(range=><button type="button" key={range} aria-pressed={filters.range===range} onClick={()=>onChange({...filters,range})}>{range==='all'?'全部':range==='week'?'本周':'本月'}</button>)}</div><div className="study-search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor={`${id}-search`}>搜索学习记录</label><input id={`${id}-search`} type="search" value={filters.search} placeholder="搜索内容、课程或备注" onChange={e=>onChange({...filters,search:e.target.value})} /></div><div className="study-course-filter"><label className="sr-only" htmlFor={`${id}-course`}>筛选学习课程</label><select id={`${id}-course`} value={filters.courseId} onChange={e=>onChange({...filters,courseId:e.target.value})}><option value="all">全部课程</option><option value="other">其他学习</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name} · {semesters.find(s=>s.id===c.semesterId)?.name}</option>)}</select></div></div>
}
