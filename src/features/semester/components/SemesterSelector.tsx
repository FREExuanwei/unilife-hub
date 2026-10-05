import { useId, useState } from 'react'
import { CalendarRange, Plus, Pencil, Trash2 } from 'lucide-react'
import { useCourses } from '../../courses/useCourses'
import type { Semester } from '../semesterTypes'
import { semesterEndDate } from '../semesterUtils'
import SemesterModal from './SemesterModal'
import SemesterDeleteModal from './SemesterDeleteModal'
interface Props { semester:Semester|null; onSelect:(id:string)=>void; isWithin:boolean; onFeedback?:(message:string)=>void }
export default function SemesterSelector({semester,onSelect,isWithin,onFeedback}:Props) {
  const id=useId()
  const {data}=useCourses()
  const [dialog,setDialog]=useState<'new'|'edit'|'delete'|null>(null)
  return <section className="semester-selector" aria-label="学期选择与管理">
    <div className="semester-selector-top"><CalendarRange size={23} aria-hidden="true" /><div className="semester-selector-field"><label htmlFor={id}>当前查看学期</label><select id={id} value={semester?.id??''} onChange={event=>onSelect(event.target.value)}>{!semester && <option value="">尚未设置学期</option>}{data.semesters.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="semester-selector-actions"><button type="button" className="secondary-button" onClick={()=>setDialog('new')}><Plus size={17} aria-hidden="true" />新建学期</button>{semester && <><button type="button" className="icon-button" aria-label="编辑当前学期" onClick={()=>setDialog('edit')}><Pencil size={18} aria-hidden="true" /></button><button type="button" className="icon-button" aria-label="删除当前学期" onClick={()=>setDialog('delete')}><Trash2 size={18} aria-hidden="true" /></button></>}</div></div>
    {semester && <p className="semester-range">{semester.startDate} ～ {semesterEndDate(semester)} · 共 {semester.totalWeeks} 周</p>}
    {!isWithin && data.semesters.length>0 && <p className="semester-gap-note">当前日期不在已设置学期范围内。默认展示最近学期，也可以手动切换。</p>}
    <p className="semester-view-hint">手动切换仅用于本次查看，重新进入时按当前日期自动选择。</p>
    {(dialog === 'new' || dialog === 'edit') && <SemesterModal semesterId={dialog === 'edit'?semester?.id:undefined} onClose={()=>setDialog(null)} onSaved={savedId=>{if(savedId)onSelect(savedId);onFeedback?.('学期已保存，课程安排已更新。')}} />}
    {dialog === 'delete' && semester && <SemesterDeleteModal semester={semester} onClose={()=>setDialog(null)} onDeleted={()=>{setDialog(null);onFeedback?.('学期已删除，相关任务与考试已安全保留。')}} />}
  </section>
}
