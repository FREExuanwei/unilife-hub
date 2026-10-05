import { ArrowUpRight, BookOpen, CalendarDays, MapPin, Plus, Timer } from 'lucide-react'
import type { Exam } from '../examTypes'
import { formatExamDate, formatExamTime, getExamUrgency } from '../examUtils'
import CountdownBadge from './CountdownBadge'
import ExamTypeBadge from './ExamTypeBadge'

interface Props { exam?: Exam; courseName?: string; now: Date; onOpen: () => void; onAdd: () => void }

export default function NextExamCard({ exam, courseName, now, onOpen, onAdd }: Props) {
  if (!exam) return <section className="next-exam-empty" aria-label="下一场考试"><span className="next-exam-icon"><Timer size={28} aria-hidden="true" /></span><div><h2>暂无即将到来的考试</h2><p>新的安排，随时可以记在这里。</p></div><button type="button" className="secondary-button" onClick={onAdd}><Plus size={16} aria-hidden="true" />添加考试</button></section>
  return <section className={`next-exam-card exam-urgency-${getExamUrgency(exam, now)}`} aria-label="下一场考试">
    <div className="next-exam-copy"><p className="next-exam-eyebrow"><Timer size={17} aria-hidden="true" />下一场考试</p><div className="next-exam-title"><h2>{exam.title}</h2><ExamTypeBadge type={exam.examType} /></div><div className="next-exam-meta"><span><CalendarDays size={16} aria-hidden="true" />{formatExamDate(exam)}{(exam.startTime || exam.endTime) && ` · ${formatExamTime(exam)}`}</span>{courseName && <span><BookOpen size={16} aria-hidden="true" />{courseName}</span>}{exam.location && <span><MapPin size={16} aria-hidden="true" />{exam.location}</span>}</div></div>
    <div className="next-exam-countdown"><CountdownBadge exam={exam} now={now} /><button type="button" className="secondary-button" onClick={onOpen}>查看考试详情<ArrowUpRight size={16} aria-hidden="true" /></button></div>
  </section>
}
