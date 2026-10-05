import { Pencil, Trash2 } from 'lucide-react'
import { useStudy } from '../useStudy'
import type { StudyRecord } from '../studyTypes'
import { formatDuration } from '../studyUtils'
export default function StudyRecordDetails({record,onEdit,onDelete}:{record:StudyRecord;onEdit:()=>void;onDelete:()=>void}){
  const {courses,semesters}=useStudy(),course=courses.find(c=>c.id===record.courseId)
  const dateTime=(time:string)=>new Date(time).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
  return <div className="study-record-details"><span className="study-tag">{record.source==='pomodoro'?'番茄钟':'手动记录'}</span><h3>{record.title}</h3><strong className="study-detail-duration">{formatDuration(record.durationMinutes)}</strong><dl><div><dt>学习日期</dt><dd>{record.date}</dd></div><div><dt>关联课程</dt><dd>{course?.name??(record.courseNameSnapshot?`${record.courseNameSnapshot}（课程已删除）`:'其他学习')}</dd></div><div><dt>所属学期</dt><dd>{semesters.find(s=>s.id===record.semesterId)?.name??'无学期关联'}</dd></div>{record.startTime&&record.endTime&&<><div><dt>开始时间</dt><dd>{dateTime(record.startTime)}</dd></div><div><dt>结束时间</dt><dd>{dateTime(record.endTime)}</dd></div></>}</dl>{record.source==='pomodoro'&&<p className="field-hint">{record.pomodoroCompleted?'完整专注':'提前结束的专注'} · 仅统计实际学习时间，暂停不计入。</p>}<div className="study-detail-note"><h4>备注</h4><p>{record.note||'还没有备注。'}</p></div><footer className="form-actions"><button type="button" className="secondary-button" onClick={onDelete}><Trash2 size={17} aria-hidden="true" />删除记录</button><button type="button" className="primary-button" onClick={onEdit}><Pencil size={17} aria-hidden="true" />编辑记录</button></footer></div>
}
