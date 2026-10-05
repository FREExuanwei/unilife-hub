import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { useCourses } from '../../courses/useCourses'
import { semesterEndDate } from '../../semester/semesterUtils'
import type { Exam, ExamDraft, ExamErrors, ExamType } from '../examTypes'
import { EXAM_TYPES, isExamOutsideSemester, validateExam } from '../examUtils'
import { useEditGuard } from '../../courses/useEditGuard'

interface Props { exam?: Exam; semesterId: string | null; onSave: (draft: ExamDraft, confirmOutside: boolean) => Promise<string | null>; onCancel: () => void }

export default function ExamForm({ exam, semesterId, onSave, onCancel }: Props) {
  const id = useId()
  const checkEdit=useEditGuard('exams',exam?.id)
  const summaryRef = useRef<HTMLDivElement>(null)
  const { data } = useCourses()
  const [draft, setDraft] = useState<ExamDraft>(() => exam ? {
    semesterId: exam.semesterId, courseId: exam.courseId, title: exam.title, examType: exam.examType,
    examDate: exam.examDate, startTime: exam.startTime, endTime: exam.endTime,
    location: exam.location, seat: exam.seat, note: exam.note,
  } : {
    semesterId: semesterId ?? '', courseId: null, title: '', examType: 'final', examDate: '',
    startTime: null, endTime: null, location: '', seat: '', note: '',
  })
  const [errors, setErrors] = useState<ExamErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmOutside, setConfirmOutside] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  const semester = data.semesters.find(item => item.id === draft.semesterId)
  const courses = data.courses.filter(course => course.semesterId === draft.semesterId)
  const outside = Boolean(semester && isExamOutsideSemester(draft, semester))
  const entries = Object.entries(errors).filter((entry): entry is [keyof ExamDraft, string] => Boolean(entry[1]))

  function change<K extends keyof ExamDraft>(key: K, value: ExamDraft[K]) {
    setDraft(current => ({ ...current, [key]: value, ...(key === 'semesterId' ? { courseId: null } : {}) }))
    setErrors(current => ({ ...current, [key]: undefined, ...(key === 'semesterId' ? { courseId: undefined } : {}) }))
    setSaveError(null)
    if (key === 'semesterId' || key === 'examDate') {
      setConfirmOutside(false)
      setConfirmError(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const stale=checkEdit();if(stale){setSaveError(stale);return}
    const next = validateExam(draft, data.semesters, data.courses)
    setErrors(next)
    const invalid = Object.keys(next).filter(key => next[key as keyof ExamDraft])
    if (invalid.length) {
      window.setTimeout(() => invalid.length > 1 ? summaryRef.current?.focus() : document.getElementById(`${id}-${invalid[0]}`)?.focus(), 0)
      return
    }
    if (outside && !confirmOutside) {
      setConfirmError(true)
      document.getElementById(`${id}-confirmOutside`)?.focus()
      return
    }
    setSaveError(await onSave(draft, outside && confirmOutside))
  }

  const fieldProps = (key: keyof ExamDraft) => ({ id: `${id}-${key}`, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined })
  const error = (key: keyof ExamDraft) => errors[key] && <p className="field-error" id={`${id}-${key}-error`}>{errors[key]}</p>

  if (!data.semesters.length) return <div className="exam-form-no-semester"><TriangleAlert size={28} aria-hidden="true" /><h3>请先设置所属学期</h3><p>关闭弹窗后，点击「新建学期」设置学期日期，再添加考试。</p><footer className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>返回设置学期</button></footer></div>

  return <form className="bookmark-form exam-form" noValidate onSubmit={submit}>
    {entries.length > 1 && <div ref={summaryRef} className="exam-error-summary" tabIndex={-1} role="alert"><p>请检查以下内容后再保存：</p><ul>{entries.map(([key, message]) => <li key={key}><a href={`#${id}-${key}`} onClick={event => { event.preventDefault(); document.getElementById(`${id}-${key}`)?.focus() }}>{message}</a></li>)}</ul></div>}
    <div className="form-field"><label htmlFor={`${id}-title`}>考试名称 <span className="required-mark" aria-hidden="true">*</span></label><input {...fieldProps('title')} autoFocus required maxLength={120} placeholder="例如：高等数学期末考试" value={draft.title} onChange={event => change('title', event.target.value)} />{error('title')}</div>
    <div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-examType`}>考试类型</label><select {...fieldProps('examType')} value={draft.examType} onChange={event => change('examType', event.target.value as ExamType)}>{EXAM_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{error('examType')}</div>
      <div className="form-field"><label htmlFor={`${id}-semesterId`}>所属学期 <span className="required-mark" aria-hidden="true">*</span></label><select {...fieldProps('semesterId')} required value={draft.semesterId} onChange={event => change('semesterId', event.target.value)}><option value="" disabled>请选择学期</option>{data.semesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{error('semesterId')}</div></div>
    {semester && <p className="exam-save-destination">考试将保存到「{semester.name}」<span>{semester.startDate} ～ {semesterEndDate(semester)}</span></p>}
    <div className="form-field"><label htmlFor={`${id}-courseId`}>关联课程 <span className="optional-label">选填</span></label><select {...fieldProps('courseId')} value={draft.courseId ?? ''} onChange={event => change('courseId', event.target.value || null)}><option value="">不关联课程</option>{draft.courseId && !courses.some(course => course.id === draft.courseId) && <option value={draft.courseId} disabled>原关联课程已变更，请重新选择</option>}{courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}</select>{error('courseId')}<p className="field-hint">{courses.length ? '只显示所选学期中的课程；切换学期会清除课程关联。' : '当前学期暂无课程，可以保存不关联课程的考试。'}</p></div>
    <div className="form-field"><label htmlFor={`${id}-examDate`}>考试日期 <span className="required-mark" aria-hidden="true">*</span></label><input {...fieldProps('examDate')} type="date" required min="1900-01-01" max="9999-12-31" value={draft.examDate} onChange={event => change('examDate', event.target.value)} />{error('examDate')}</div>
    <div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-startTime`}>开始时间 <span className="optional-label">选填</span></label><input {...fieldProps('startTime')} type="time" value={draft.startTime ?? ''} onChange={event => change('startTime', event.target.value || null)} />{error('startTime')}</div>
      <div className="form-field"><label htmlFor={`${id}-endTime`}>结束时间 <span className="optional-label">选填</span></label><input {...fieldProps('endTime')} type="time" value={draft.endTime ?? ''} onChange={event => change('endTime', event.target.value || null)} />{error('endTime')}</div></div>
    <p className="field-hint">时间按设备本地时间计算。不填时间时只按日期倒计时；同时填写时，结束必须晚于开始。</p>
    {outside && <div className="exam-outside-warning"><p id={`${id}-outside-hint`}><TriangleAlert size={18} aria-hidden="true" />该考试日期不在当前学期范围内，是否仍然保存？</p><label htmlFor={`${id}-confirmOutside`}><input id={`${id}-confirmOutside`} type="checkbox" checked={confirmOutside} aria-invalid={confirmError} aria-describedby={`${id}-outside-hint${confirmError ? ` ${id}-outside-error` : ''}`} onChange={event => { setConfirmOutside(event.target.checked); setConfirmError(false); setSaveError(null) }} /><span>仍然保存到此学期</span></label><small>适用于补考、资格考试等特殊安排。更改日期或学期后需要重新确认。</small>{confirmError && <p className="field-error" id={`${id}-outside-error`} role="alert">请勾选确认后再保存，或调整考试日期与所属学期。</p>}</div>}
    <div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-location`}>考试地点 <span className="optional-label">选填</span></label><input {...fieldProps('location')} maxLength={200} placeholder="例如：教学楼 A301" value={draft.location} onChange={event => change('location', event.target.value)} />{error('location')}</div><div className="form-field"><label htmlFor={`${id}-seat`}>座位号 <span className="optional-label">选填</span></label><input {...fieldProps('seat')} maxLength={80} placeholder="例如：A12、35号" value={draft.seat} onChange={event => change('seat', event.target.value)} />{error('seat')}</div></div>
    <div className="form-field"><label htmlFor={`${id}-note`}>备注 <span className="optional-label">选填</span></label><textarea {...fieldProps('note')} rows={3} maxLength={3000} placeholder="携带学生证、计算器，或提前到场的提醒…" value={draft.note} onChange={event => change('note', event.target.value)} />{error('note')}</div>
    {exam?.associationNote && <p className="exam-association-note">{exam.associationNote}</p>}
    {saveError && <p className="form-save-error" role="alert">{saveError}</p>}
    <footer className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>取消</button><button type="submit" className="primary-button"><Check size={17} aria-hidden="true" />{exam ? '保存修改' : '保存考试'}</button></footer>
  </form>
}
