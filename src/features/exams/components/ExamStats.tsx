import { CalendarDays, CircleCheck, Timer } from 'lucide-react'
import type { Exam } from '../examTypes'
import { examStats } from '../examUtils'

export default function ExamStats({ exams, now }: { exams: Exam[]; now: Date }) {
  const stats = examStats(exams, now)
  const items = [
    { key: 'upcoming' as const, label: '即将考试', icon: Timer, tone: 'purple' },
    { key: 'withinWeek' as const, label: '7 天内', icon: CalendarDays, tone: 'orange' },
    { key: 'ended' as const, label: '已结束', icon: CircleCheck, tone: 'neutral' },
  ]
  return <section className="exam-stats" aria-label="考试统计">{items.map(({ key, label, icon: Icon, tone }) => <article key={key} className={`exam-stat tone-${tone}`}><div><span>{label}</span><strong>{stats[key]}<small>场</small></strong></div><span className="exam-stat-icon"><Icon size={23} aria-hidden="true" /></span></article>)}</section>
}
