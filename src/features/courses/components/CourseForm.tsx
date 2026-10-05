import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import type { Course, CourseDraft, CourseErrors, Weekday } from '../courseTypes'
import { findConflicts, validateCourse, WEEKDAYS } from '../courseUtils'
import ColorPicker from './ColorPicker'
import { useEditGuard } from '../useEditGuard'
import WeekSelector from '../../semester/components/WeekSelector'
import { formatWeeks, generateWeeks, getOverlappingWeeks } from '../../semester/weekUtils'

interface CourseFormProps { course?: Course; courses: Course[]; semesterId:string; defaultDay: Weekday; totalWeeks: number; onSave: (draft: CourseDraft, allowConflict: boolean) => Promise<string | null>; onCancel: () => void }
export default function CourseForm({ course, courses, semesterId, defaultDay, totalWeeks, onSave, onCancel }: CourseFormProps) {
  const id = useId()
  const checkEdit=useEditGuard('courses',course?.id)
  const [draft, setDraft] = useState<CourseDraft>(() => course ? { ...course, weekMode: course.weeks.length ? course.weekMode : 'custom' } : { semesterId, name: '', weekday: defaultDay, startTime: '08:00', endTime: '09:40', teacher: '', classroom: '', color: 'blue', note: '', weeks: generateWeeks('every',1,totalWeeks,totalWeeks), weekMode: 'every' })
  const [errors, setErrors] = useState<CourseErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState('')
  const conflicts = findConflicts(draft, courses, course?.id)
  const signature = JSON.stringify([draft.weekday, draft.startTime, draft.endTime, draft.weeks, conflicts.map(item => [item.id, item.startTime, item.endTime, item.weeks])])
  const confirmed = acknowledged === signature
  function change<K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined, ...(key === 'startTime' ? { endTime: undefined } : {}) }))
    setSaveError(null)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const stale=checkEdit();if(stale){setSaveError(stale);return}
    const next = validateCourse(draft, totalWeeks)
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return }
    if (conflicts.length && !confirmed) { setSaveError('该课程与已有课程时间冲突，请勾选确认后再保存。'); document.getElementById(`${id}-conflict`)?.focus(); return }
    setSaveError(await onSave(draft, confirmed))
  }
  const fieldProps = (key: keyof CourseDraft) => ({ id: `${id}-${key}`, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined })
  const errorText = (key: keyof CourseDraft) => errors[key] && <p className="field-error" id={`${id}-${key}-error`}>{errors[key]}</p>
  return <form className="bookmark-form course-form" onSubmit={submit} noValidate>
    <div className="form-field"><label htmlFor={`${id}-name`}>课程名称 <span className="required-mark">*</span></label><input {...fieldProps('name')} autoFocus required maxLength={80} value={draft.name} placeholder="例如：高等数学" onChange={event => change('name', event.target.value)} />{errorText('name')}</div>
    <div className="form-field"><label htmlFor={`${id}-weekday`}>星期 <span className="required-mark">*</span></label><select {...fieldProps('weekday')} required value={draft.weekday} onChange={event => change('weekday', Number(event.target.value) as Weekday)}>{WEEKDAYS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}</select>{errorText('weekday')}</div>
    <div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-startTime`}>开始时间 <span className="required-mark">*</span></label><input {...fieldProps('startTime')} type="time" required value={draft.startTime} onChange={event => change('startTime', event.target.value)} />{errorText('startTime')}</div><div className="form-field"><label htmlFor={`${id}-endTime`}>结束时间 <span className="required-mark">*</span></label><input {...fieldProps('endTime')} type="time" required value={draft.endTime} onChange={event => change('endTime', event.target.value)} />{errorText('endTime')}</div></div>
    <WeekSelector id={`${id}-weeks`} mode={draft.weekMode} weeks={draft.weeks} totalWeeks={totalWeeks} error={errors.weeks ?? errors.weekMode} onChange={(mode, weeks) => { setDraft(current => ({...current, weekMode: mode, weeks})); setErrors(current => ({...current,weeks:undefined,weekMode:undefined})); setSaveError(null) }} />
    {conflicts.length > 0 && <div className="course-conflict" role="status"><strong><TriangleAlert size={17} aria-hidden="true" />该课程与已有课程时间冲突。</strong><ul>{conflicts.map(item => <li key={item.id}>与 {item.name} 在 {formatWeeks(getOverlappingWeeks(draft.weeks,item.weeks))} 时间冲突 · {item.startTime}–{item.endTime}</li>)}</ul><label htmlFor={`${id}-conflict`}><input id={`${id}-conflict`} type="checkbox" checked={confirmed} onChange={event => { setAcknowledged(event.target.checked ? signature : ''); setSaveError(null) }} />我已了解时间冲突，仍然保存</label></div>}
    <div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-teacher`}>教师 <span className="optional-label">选填</span></label><input {...fieldProps('teacher')} maxLength={80} value={draft.teacher} placeholder="教师姓名" onChange={event => change('teacher', event.target.value)} />{errorText('teacher')}</div><div className="form-field"><label htmlFor={`${id}-classroom`}>教室 <span className="optional-label">选填</span></label><input {...fieldProps('classroom')} maxLength={100} value={draft.classroom} placeholder="例如：教学楼 A203" onChange={event => change('classroom', event.target.value)} />{errorText('classroom')}</div></div>
    <ColorPicker value={draft.color} onChange={value => change('color', value)} />
    <div className="form-field"><label htmlFor={`${id}-note`}>备注 <span className="optional-label">选填</span></label><textarea {...fieldProps('note')} rows={2} maxLength={1000} value={draft.note} placeholder="教材、上课提醒，或其他想记下的事…" onChange={event => change('note', event.target.value)} />{errorText('note')}</div>
    {saveError && <p className="form-save-error" role="alert">{saveError}</p>}
    <footer className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>取消</button><button type="submit" className="primary-button"><Check size={17} aria-hidden="true" />{course ? '保存修改' : '保存课程'}</button></footer>
  </form>
}
