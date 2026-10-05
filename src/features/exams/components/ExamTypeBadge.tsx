import type { ExamType } from '../examTypes'
import { EXAM_TYPES } from '../examUtils'

export default function ExamTypeBadge({ type }: { type: ExamType }) {
  return <span className="exam-type-badge">{EXAM_TYPES.find(item => item.value === type)?.label ?? '其他考试'}</span>
}
