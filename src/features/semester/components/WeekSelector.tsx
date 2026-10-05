import { useState } from 'react'
import type { CourseWeekMode } from '../../courses/courseTypes'
import { formatWeeks, generateWeeks } from '../weekUtils'
export const WEEK_MODES: { value: CourseWeekMode; label: string }[] = [{ value: 'every', label: '每周' }, { value: 'odd', label: '单周' }, { value: 'even', label: '双周' }, { value: 'custom', label: '自定义' }]
interface Props { id: string; mode: CourseWeekMode; weeks: number[]; totalWeeks: number; error?: string; onChange: (mode: CourseWeekMode, weeks: number[]) => void }
export default function WeekSelector({ id, mode, weeks, totalWeeks, error, onChange }: Props) {
  const [start, setStart] = useState(Math.min(...(weeks.length ? weeks : [1])))
  const [end, setEnd] = useState(Math.max(...(weeks.length ? weeks : [totalWeeks])))
  const options = Array.from({ length: totalWeeks }, (_, i) => i + 1)
  const rangeError = mode !== 'custom' && (start < 1 || end > totalWeeks || end < start)
  return <fieldset id={id} tabIndex={-1} className="week-selector" aria-invalid={Boolean(error || rangeError)} aria-describedby={error || rangeError ? `${id}-error` : `${id}-summary`}><legend>上课周次 <span className="required-mark">*</span></legend>
    <div className="segmented-control week-modes" role="group" aria-label="上课周次模式">{WEEK_MODES.map(item => <button type="button" key={item.value} aria-pressed={item.value === mode} className={mode === item.value ? 'selected' : ''} onClick={() => onChange(item.value, item.value === 'custom' ? weeks : generateWeeks(item.value, start, end, totalWeeks))}>{item.label}</button>)}</div>
    {mode === 'custom' ? <><div className="custom-week-tools"><span>点击选择上课的周次</span><button type="button" onClick={() => onChange(mode, weeks.length ? [] : options)}>{weeks.length ? '清空选择' : '全选'}</button></div><div className="custom-week-grid" role="group" aria-label="自定义上课周次">{options.map(week => <button type="button" key={week} className={weeks.includes(week) ? 'selected' : ''} aria-label={`第 ${week} 周`} aria-pressed={weeks.includes(week)} onClick={() => onChange(mode, weeks.includes(week) ? weeks.filter(value => value !== week) : [...weeks, week].sort((a,b) => a-b))}>{week}</button>)}</div></>
      : <div className="course-form-row"><div className="form-field"><label htmlFor={`${id}-start`}>开始周</label><select id={`${id}-start`} value={start} onChange={event => { const value = Number(event.target.value); setStart(value); onChange(mode, generateWeeks(mode,value,end,totalWeeks)) }}>{options.map(week => <option key={week} value={week}>第 {week} 周</option>)}</select></div><div className="form-field"><label htmlFor={`${id}-end`}>结束周</label><select id={`${id}-end`} value={end} onChange={event => { const value = Number(event.target.value); setEnd(value); onChange(mode, generateWeeks(mode,start,value,totalWeeks)) }}>{options.map(week => <option key={week} value={week}>第 {week} 周</option>)}</select></div></div>}
    <p className="week-selection-summary" id={`${id}-summary`}>{formatWeeks(weeks)}<span>{weeks.length} 个上课周</span></p>
    {(error || rangeError) && <p className="field-error" id={`${id}-error`}>{rangeError ? '开始周与结束周必须在本学期范围内，结束周不能小于开始周。' : error}</p>}
  </fieldset>
}
