import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { ChartNoAxesCombined, Plus, Sprout } from 'lucide-react'
import { useCurrentDate } from '../hooks/useCurrentDate'
import { useStudy } from '../features/study/useStudy'
import { aggregateStudy, filterStudies } from '../features/study/studyUtils'
import type { StudyFilters as Filters } from '../features/study/studyTypes'
import StudySummary from '../features/study/components/StudySummary'
import StudyTrendChart from '../features/study/components/StudyTrendChart'
import CourseStudyStats from '../features/study/components/CourseStudyStats'
import StudyRecordCard from '../features/study/components/StudyRecordCard'
import StudyRecordModal from '../features/study/components/StudyRecordModal'
import type { StudyDialog } from '../features/study/components/StudyRecordModal'
import StudyFilters from '../features/study/components/StudyFilters'
import PomodoroTimer from '../features/pomodoro/components/PomodoroTimer'
export default function Statistics(){
  const now=useCurrentDate(),{records,courses,semesters,storageError}=useStudy(),[params,setParams]=useSearchParams(),location=useLocation()
  const [range,setRange]=useState<'week'|'month'>('week'),[filters,setFilters]=useState<Filters>({range:'all',courseId:'all',search:''}),[dialog,setDialog]=useState<StudyDialog|null>(null),[feedback,setFeedback]=useState(''),[page,setPage]=useState(1)
  const stats=useMemo(()=>aggregateStudy(records,courses,new Date(),range),[records,courses,now,range]),visible=useMemo(()=>filterStudies(records,courses,filters,new Date()),[records,courses,filters,now])
  const pages=Math.max(1,Math.ceil(visible.length/12)),currentPage=Math.min(page,pages),courseNames=useMemo(()=>new Map(courses.map(c=>[c.id,c.name])),[courses])
  useEffect(()=>{if(params.get('action')==='add'){setDialog({mode:'add'});const next=new URLSearchParams(params);next.delete('action');setParams(next,{replace:true})}},[params,setParams])
  useEffect(()=>{if(location.hash==='#focus-timer')document.getElementById('focus-timer')?.scrollIntoView({block:'start'})},[location.hash])
  function focus(){document.getElementById('focus-timer')?.scrollIntoView({block:'start',behavior:'smooth'});document.getElementById('focus-timer')?.querySelector<HTMLButtonElement>('.pomodoro-controls button')?.focus()}
  return <div className="statistics-page"><div className="schedule-heading"><div><p className="eyebrow">A LITTLE FOCUS, A LITTLE PROGRESS</p><h1>学习统计 <span className="schedule-title-icon"><ChartNoAxesCombined size={24} aria-hidden="true" /></span></h1><p>记录每一份专注，看见自己的成长。</p></div><button className="primary-button" type="button" disabled={Boolean(storageError)} onClick={()=>setDialog({mode:'add'})}><Plus size={18} aria-hidden="true" />添加学习记录</button></div>
    {storageError&&<p className="storage-notice" role="alert">{storageError}</p>}<p className="bookmark-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
    <StudySummary stats={stats} />
    {!records.length&&!storageError&&<section className="study-welcome"><span className="study-icon tone-cyan"><Sprout size={27} aria-hidden="true" /></span><div><h2>还没有学习记录</h2><p>开始一次专注，或者手动记录今天的学习吧。</p></div><div><button className="secondary-button" type="button" onClick={focus}>开始专注</button><button className="primary-button" type="button" onClick={()=>setDialog({mode:'add'})}>添加记录</button></div></section>}
    <div className="study-workspace"><PomodoroTimer /><div className="study-insights"><StudyTrendChart stats={stats} range={range} onRange={setRange} now={now} /><CourseStudyStats stats={stats} range={range} semesters={semesters} /></div></div>
    <section className="study-history" aria-labelledby="study-history-heading"><div className="section-heading"><h2 id="study-history-heading">学习记录 <span className="study-count">{records.length}</span></h2><span>最近的学习，排在前面</span></div><StudyFilters filters={filters} courses={courses} semesters={semesters} onChange={value=>{setFilters(value);setPage(1)}} />
      {visible.length?<><div className="study-record-list">{visible.slice((currentPage-1)*12,currentPage*12).map(record=><StudyRecordCard key={record.id} record={record} courseName={courseNames.get(record.courseId??'')} onOpen={()=>setDialog({mode:'details',id:record.id})} onEdit={()=>setDialog({mode:'edit',id:record.id})} onDelete={()=>setDialog({mode:'delete',id:record.id})} />)}</div>{pages>1&&<nav className="study-pagination" aria-label="学习记录分页"><button className="secondary-button" type="button" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>上一页</button><span>{currentPage} / {pages}</span><button className="secondary-button" type="button" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>下一页</button></nav>}</>:<div className="study-history-empty"><p>{records.length?'没有符合条件的学习记录':'你的学习故事，从第一条记录开始。'}</p>{records.length>0&&<button className="secondary-button" type="button" onClick={()=>{setFilters({range:'all',courseId:'all',search:''});setPage(1)}}>清除筛选</button>}</div>}
    </section><p className="study-footnote">按设备本地日期统计 · 每周从周一开始 · 数据保存在当前浏览器中</p><StudyRecordModal dialog={dialog} onDialog={setDialog} onFeedback={setFeedback} />
  </div>
}
