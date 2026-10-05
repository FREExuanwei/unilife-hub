import { Check } from 'lucide-react'
import { COURSE_COLORS } from '../courseUtils'
import type { CourseColor } from '../courseTypes'
export default function ColorPicker({ value, onChange }: { value: CourseColor; onChange: (color: CourseColor) => void }) {
  return <fieldset className="course-color-picker"><legend>课程颜色</legend><div>{COURSE_COLORS.map(color =>
    <button key={color.value} type="button" className={`course-color-choice course-tone-${color.value}`} aria-label={color.label} aria-pressed={value === color.value} onClick={() => onChange(color.value)}>
      <span>{value === color.value && <Check size={17} aria-hidden="true" />}</span><small>{color.label}</small>
    </button>)}</div></fieldset>
}
