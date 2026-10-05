import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check } from 'lucide-react'
import { useStudy } from '../useStudy'
import type { ManualStudyInput, StudyDraft, StudyRecord } from '../studyTypes'
import { localDate, manualStudyDraft } from '../studyUtils'
import { selectDefaultSemester } from '../../semester/semesterUtils'
import { parseLocalDate } from '../../semester/weekUtils'
import { useEditGuard } from '../../courses/useEditGuard'
interface Props { record?:StudyRecord; onSave:(draft:StudyDraft)=>Promise<string|null>; onCancel:()=>void }
const clock=(value:string|null)=>value?new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}):''
export default function StudyRecordForm({record,onSave,onCancel}:Props){
  const id=useId(),errorRef=useRef<HTMLParagraphElement>(null),{courses,semesters}=useStudy()
  const checkEdit=useEditGuard('studyRecords',record?.id)
  const [input,setInput]=useState<ManualStudyInput>({title:record?.title??'',note:record?.note??'',date:record?.date??localDate(new Date()),mode:record?.source==='manual'&&record.startTime?'range':'duration',minutes:record?.durationMinutes??60,start:clock(record?.startTime??null),end:clock(record?.endTime??null),courseId:record?.courseId??null})
  const [error,setError]=useState<string|null>(null)
  const selected=selectDefaultSemester(semesters,parseLocalDate(input.date)??new Date())
  const available=courses.filter(c=>(selected.isWithin&&c.semesterId===selected.semester?.id)||c.id===record?.courseId)
  const change=<K extends keyof ManualStudyInput>(key:K,value:ManualStudyInput[K])=>{setInput(old=>({...old,[key]:value,...(key==='date'?{courseId:null}:{})}));setError(null)}
  async function submit(event:FormEvent){
    event.preventDefault()
    const stale=checkEdit();if(stale){setError(stale);return}
    try{
      const draft=manualStudyDraft(input,semesters,courses,new Date())
      if(record){draft.source=record.source;draft.courseNameSnapshot=draft.courseNameSnapshot||record.courseNameSnapshot
        if(input.date===record.date && input.mode==='duration' && input.minutes===record.durationMinutes){draft.startTime=record.startTime;draft.endTime=record.endTime;draft.segments=record.segments}
      }
      const result=await onSave(draft);setError(result);if(result)window.setTimeout(()=>errorRef.current?.focus(),0)
    }catch(reason){setError(reason instanceof Error?reason.message:'请检查输入内容。');window.setTimeout(()=>errorRef.current?.focus(),0)}
  }
  let calculated='请填写时间'
  if(input.start&&input.end){const [a,b]=input.start.split(':').map(Number),[c,d]=input.end.split(':').map(Number);const minutes=c*60+d-a*60-b;calculated=minutes>0?`${minutes} 分钟`:'结束须晚于开始'}
  return <form className="bookmark-form study-form" noValidate onSubmit={submit}>
    <div className="form-field"><label htmlFor={`${id}-title`}>学习内容 <span className="required-mark">*</span></label><input id={`${id}-title`} autoFocus maxLength={120} value={input.title} placeholder="例如：高等数学积分复习" onChange={e=>change('title',e.target.value)} /></div>
    <div className="form-field"><label htmlFor={`${id}-date`}>学习日期</label><input id={`${id}-date`} type="date" min="1900-01-01" max={localDate(new Date())} value={input.date} onChange={e=>change('date',e.target.value)} /></div>
    <div className="form-field"><label htmlFor={`${id}-course`}>关联课程</label><select id={`${id}-course`} value={input.courseId??''} onChange={e=>change('courseId',e.target.value||null)}><option value="">不关联课程</option>{available.map(course=><option key={course.id} value={course.id}>{course.name} · {semesters.find(s=>s.id===course.semesterId)?.name}</option>)}</select><p className="field-hint">{selected.isWithin?`按记录日期归入「${selected.semester?.name}」，课程来自该学期。`:'当前日期不在已设置学期内，可以正常记录其他学习。'}{record?.courseNameSnapshot&&!record.courseId?` 原课程：${record.courseNameSnapshot}（已删除）。`:''}</p></div>
    <fieldset className="study-mode-field"><legend>记录方式</legend><div className="study-range-toggle"><button type="button" aria-pressed={input.mode==='duration'} onClick={()=>change('mode','duration')}>直接填写时长</button><button type="button" aria-pressed={input.mode==='range'} onClick={()=>change('mode','range')}>开始 / 结束时间</button></div></fieldset>
    {input.mode==='duration'?<div className="form-field"><label htmlFor={`${id}-minutes`}>学习时长（分钟）</label><input id={`${id}-minutes`} type="number" inputMode="numeric" min={1} max={1440} step={1} value={Number.isNaN(input.minutes)?'':input.minutes} onChange={e=>change('minutes',e.target.value===''?NaN:Number(e.target.value))} /><p className="field-hint">1～1440 分钟，无需填写精确时间。{record?.source==='pomodoro'?'修改日期或时长后，原专注时间段将转为直接时长记录，来源仍保留。':''}</p></div>:<><div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-start`}>开始时间</label><input id={`${id}-start`} type="time" value={input.start} onChange={e=>change('start',e.target.value)} /></div><div className="form-field"><label htmlFor={`${id}-end`}>结束时间</label><input id={`${id}-end`} type="time" value={input.end} onChange={e=>change('end',e.target.value)} /></div></div><p className="study-calculated-duration">自动计算：{calculated}</p><p className="field-hint">开始和结束属于同一天，跨午夜请分两条记录。</p></>}
    <div className="form-field"><label htmlFor={`${id}-note`}>备注</label><textarea id={`${id}-note`} rows={3} maxLength={3000} value={input.note} placeholder="记下学了什么，或者下次想继续的地方。" onChange={e=>change('note',e.target.value)} /></div>
    {error&&<p ref={errorRef} tabIndex={-1} className="form-save-error" role="alert">{error}</p>}
    <footer className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>取消</button><button type="submit" className="primary-button"><Check size={17} aria-hidden="true" />{record?'保存修改':'保存学习记录'}</button></footer>
  </form>
}
