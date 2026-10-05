import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, BookOpen, ListTodo } from 'lucide-react'
import type { Task, TaskDraft, TaskErrors, TaskPriority, TaskType } from '../taskTypes'
import { PRIORITIES, validateTask } from '../taskUtils'
import { useCourses } from '../../courses/useCourses'
import { useEditGuard } from '../../courses/useEditGuard'
interface Props { task?:Task; semesterId:string|null; onSave:(draft:TaskDraft)=>Promise<string|null>; onCancel:()=>void }
export default function TaskForm({task,semesterId,onSave,onCancel}:Props) {
  const id=useId()
  const {data}=useCourses()
  const checkEdit=useEditGuard('tasks',task?.id)
  const [draft,setDraft]=useState<TaskDraft>(()=>task ? {...task} : {type:'todo',title:'',description:'',semesterId:null,courseId:null,dueDate:null,dueTime:null,priority:'normal'})
  const [errors,setErrors]=useState<TaskErrors>({})
  const [saveError,setSaveError]=useState<string|null>(null)
  const courses=data.courses.filter(course=>course.semesterId === draft.semesterId)
  function change<K extends keyof TaskDraft>(key:K,value:TaskDraft[K]) {setDraft(current=>({...current,[key]:value}));setErrors(current=>({...current,[key]:undefined}));setSaveError(null)}
  function typeChange(type:TaskType) {setDraft(current=>({...current,type,courseId:null,semesterId:type === 'assignment' ? current.semesterId??semesterId : current.semesterId}));setErrors({});setSaveError(null)}
  async function submit(event:FormEvent<HTMLFormElement>) {event.preventDefault();const stale=checkEdit();if(stale){setSaveError(stale);return}const next=validateTask(draft,data.semesters,data.courses);setErrors(next);const first=Object.keys(next)[0];if(first){document.getElementById(`${id}-${first}`)?.focus();return};setSaveError(await onSave(draft))}
  const props=(key:keyof TaskDraft)=>({id:`${id}-${key}`,'aria-invalid':Boolean(errors[key]),'aria-describedby':errors[key]?`${id}-${key}-error`:undefined})
  const error=(key:keyof TaskDraft)=>errors[key] && <p className="field-error" id={`${id}-${key}-error`}>{errors[key]}</p>
  return <form className="bookmark-form task-form" noValidate onSubmit={submit}>
    <div className="form-field"><span className="field-label" id={`${id}-type-label`}>任务类型</span><div className="segmented-control task-type-options" role="group" aria-labelledby={`${id}-type-label`}><button type="button" className={draft.type === 'todo'?'selected':''} aria-pressed={draft.type === 'todo'} onClick={()=>typeChange('todo')}><ListTodo size={17} aria-hidden="true" />普通待办</button><button type="button" className={draft.type === 'assignment'?'selected':''} aria-pressed={draft.type === 'assignment'} onClick={()=>typeChange('assignment')}><BookOpen size={17} aria-hidden="true" />课程作业</button></div></div>
    <div className="form-field"><label htmlFor={`${id}-title`}>标题 <span className="required-mark">*</span></label><input {...props('title')} autoFocus required maxLength={120} placeholder="例如：完成高等数学练习" value={draft.title} onChange={event=>change('title',event.target.value)} />{error('title')}</div>
    <div className="form-field"><label htmlFor={`${id}-semesterId`}>所属学期{draft.type === 'assignment' && <span className="required-mark"> *</span>}</label><select {...props('semesterId')} value={draft.semesterId??''} onChange={event=>{setDraft(current=>({...current,semesterId:event.target.value||null,courseId:null}));setErrors(current=>({...current,semesterId:undefined,courseId:undefined}));setSaveError(null)}}><option value="">{draft.type === 'todo'?'不限定学期 · 全局待办':'请选择学期'}</option>{data.semesters.map(semester=><option key={semester.id} value={semester.id}>{semester.name}</option>)}</select>{error('semesterId')}<p className="field-hint">{draft.type === 'todo'?'全局待办在任何学期都会显示。':'作业属于所选学期，可以不关联课程。'}</p></div>
    {draft.type === 'assignment' && <div className="form-field"><label htmlFor={`${id}-courseId`}>关联课程 <span className="optional-label">选填</span></label><select {...props('courseId')} value={draft.courseId??''} onChange={event=>change('courseId',event.target.value||null)}><option value="">不关联课程</option>{courses.map(course=><option key={course.id} value={course.id}>{course.name}</option>)}</select>{error('courseId')}{courses.length === 0 && <p className="field-hint">当前学期暂无课程，仍可创建不关联课程的任务。</p>}</div>}
    <div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-dueDate`}>截止日期 <span className="optional-label">选填</span></label><input {...props('dueDate')} type="date" min="1900-01-01" max="9999-12-31" value={draft.dueDate??''} onChange={event=>change('dueDate',event.target.value||null)} />{error('dueDate')}</div><div className="form-field"><label htmlFor={`${id}-dueTime`}>截止时间 <span className="optional-label">选填</span></label><input {...props('dueTime')} type="time" value={draft.dueTime??''} onChange={event=>change('dueTime',event.target.value||null)} />{error('dueTime')}</div></div><p className="field-hint">仅日期默认当天结束后逾期；无截止日期的任务不会逾期。</p>
    <div className="form-field"><label htmlFor={`${id}-priority`}>优先级</label><select {...props('priority')} value={draft.priority} onChange={event=>change('priority',event.target.value as TaskPriority)}>{PRIORITIES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>{error('priority')}</div>
    <div className="form-field"><label htmlFor={`${id}-description`}>描述 <span className="optional-label">选填</span></label><textarea {...props('description')} rows={3} maxLength={3000} placeholder="记下要求、思路或你想补充的内容…" value={draft.description} onChange={event=>change('description',event.target.value)} />{error('description')}</div>
    {task?.associationNote && <p className="task-association-note">{task.associationNote}</p>}{saveError && <p className="form-save-error" role="alert">{saveError}</p>}<footer className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>取消</button><button type="submit" className="primary-button"><Check size={17} aria-hidden="true" />{task?'保存修改':'保存任务'}</button></footer>
  </form>
}
