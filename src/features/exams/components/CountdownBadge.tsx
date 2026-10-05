import { Clock3 } from 'lucide-react'
import type { Exam } from '../examTypes'
import { getExamCountdown, getExamUrgency } from '../examUtils'

export default function CountdownBadge({ exam, now }: { exam: Exam; now: Date }) {
  return <span className={`exam-countdown exam-urgency-${getExamUrgency(exam, now)}`}><Clock3 size={14} aria-hidden="true" />{getExamCountdown(exam, now)}</span>
}
