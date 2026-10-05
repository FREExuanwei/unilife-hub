import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, TriangleAlert, CalendarRange } from 'lucide-react'
import type { Semester, SemesterDraft, SemesterErrors } from '../semesterTypes'
import type { Course } from '../../courses/courseTypes'
import { affectedCourses, validateSemester } from '../semesterUtils'
import { findSemesterOverlaps, semesterEndDate } from '../semesterUtils'
import { formatWeeks } from '../weekUtils'
import { useEditGuard } from '../../courses/useEditGuard'

const presets = [16, 18, 20, 22]
interface Props { semester: Semester | null; semesters: Semester[]; courses: Course[]; onSave: (semester: SemesterDraft, confirmed: boolean) => Promise<string | null>; onCancel: () => void }
export default function SemesterForm({ semester, semesters, courses, onSave, onCancel }: Props) {
  const id = useId()
  const checkEdit=useEditGuard('semesters',semester?.id)
  const [name, setName] = useState(semester?.name ?? '')
  const [startDate, setStartDate] = useState(semester?.startDate ?? '')
  const [total, setTotal] = useState(semester ? String(semester.totalWeeks) : '')
  const [custom, setCustom] = useState(Boolean(semester && !presets.includes(semester.totalWeeks)))
  const [errors, setErrors] = useState<SemesterErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState('')
  const draft: SemesterDraft = { name, startDate, totalWeeks: total.trim() ? Number(total) : NaN }
  const overlaps = findSemesterOverlaps({...draft,id:semester?.id ?? ''},semesters)
  const affected = Number.isInteger(draft.totalWeeks) && draft.totalWeeks >= 1 && draft.totalWeeks <= 30 ? affectedCourses(courses, draft.totalWeeks) : []
  const signature = JSON.stringify([draft, affected.map(course => [course.id, course.weeks])])
  const confirmed = acknowledged === signature
  function clearError(key: keyof SemesterDraft) { setErrors(current => ({ ...current, [key]: undefined })); setSaveError(null) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const stale=checkEdit();if(stale){setSaveError(stale);return}
    const next = validateSemester(draft)
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return }
    if (overlaps.length) { setSaveError('该学期日期范围与已有学期重叠，请修改后再保存。'); return }
    if (affected.length && !confirmed) { setSaveError('请确认移除超出范围的周次，或取消修改。'); document.getElementById(`${id}-trim`)?.focus(); return }
    setSaveError(await onSave(draft, confirmed))
  }
  const error = (key: keyof SemesterDraft) => errors[key] && <p id={`${id}-${key}-error`} className="field-error">{errors[key]}</p>
  const props = (key: keyof SemesterDraft) => ({ id: `${id}-${key}`, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined })
  return <form className="bookmark-form semester-form" noValidate onSubmit={submit}>
    <div className="semester-form-intro"><CalendarRange size={25} aria-hidden="true" /><p>设置一次，课程与每一周自动关联。<small>周一至周日为一周，开始日期所在周为第 1 周。</small></p></div>
    <div className="form-field"><label htmlFor={`${id}-name`}>学期名称 <span className="required-mark">*</span></label><input {...props('name')} autoFocus maxLength={80} required placeholder="例如：2026-2027 第一学期" value={name} onChange={event => { setName(event.target.value); clearError('name') }} />{error('name')}</div>
    <div className="form-field"><label htmlFor={`${id}-startDate`}>学期开始日期 <span className="required-mark">*</span></label><input {...props('startDate')} type="date" min="1900-01-01" max="9999-12-31" required value={startDate} onChange={event => { setStartDate(event.target.value); clearError('startDate') }} />{error('startDate')}</div>
    <div className="form-field"><span className="field-label" id={`${id}-total-label`}>学期总周数 <span className="required-mark">*</span></span><div className="semester-presets" role="group" aria-labelledby={`${id}-total-label`}>
      {presets.map(value => <button key={value} type="button" className={!custom && total === String(value) ? 'selected' : ''} aria-pressed={!custom && total === String(value)} onClick={() => { setCustom(false); setTotal(String(value)); clearError('totalWeeks') }}><strong>{value}</strong><span>周</span></button>)}
      <button type="button" className={custom ? 'selected' : ''} aria-pressed={custom} onClick={() => { setCustom(true); clearError('totalWeeks') }}>自定义</button>
    </div>
    {custom ? <><label htmlFor={`${id}-totalWeeks`}>自定义总周数</label><input {...props('totalWeeks')} type="number" inputMode="numeric" min={1} max={30} step={1} placeholder="1～30 周" value={total} onChange={event => { setTotal(event.target.value); clearError('totalWeeks') }} /></> : <span id={`${id}-totalWeeks`} tabIndex={-1} className="field-hint">{total ? `已选择 ${total} 周，之后仍可修改。` : '请选择常用周数，或使用自定义。'}</span>}{error('totalWeeks')}</div>
    {courses.some(course => course.needsWeekMigration) && <p className="semester-migration-note">已保留 {courses.filter(course => course.needsWeekMigration).length} 门旧课程。保存学期后，将迁移为第 1 周至本学期最后一周每周上课。</p>}
    {affected.length > 0 && <div className="course-conflict semester-trim" role="status"><strong><TriangleAlert size={18} aria-hidden="true" />部分课程包含超出新学期总周数的周次。</strong><ul>{affected.map(course => <li key={course.id}><b>{course.name}</b>：{formatWeeks(course.weeks.filter(week => week > draft.totalWeeks))}{course.weeks.every(week => week > draft.totalWeeks) && <small>移除后保留课程，标记为待安排周次。</small>}</li>)}</ul><label htmlFor={`${id}-trim`}><input id={`${id}-trim`} type="checkbox" checked={confirmed} onChange={event => { setAcknowledged(event.target.checked ? signature : ''); setSaveError(null) }} />确认移除超出范围的周次，保留所有课程</label><p>取消或关闭表单即可保留原来的学期与课程。</p></div>}
    {!Object.keys(validateSemester(draft)).length && <p className="field-hint">学期日期范围：{startDate} ～ {semesterEndDate({...draft,id:''})}</p>}
    {overlaps.length > 0 && <p className="form-save-error" role="alert">该学期日期范围与已有学期重叠：{overlaps.map(item=>item.name).join('、')}。请修改后再保存。</p>}
    {saveError && <p className="form-save-error" role="alert">{saveError}</p>}
    <footer className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>取消修改</button><button type="submit" className="primary-button"><Check size={17} aria-hidden="true" />保存学期</button></footer>
  </form>
}
