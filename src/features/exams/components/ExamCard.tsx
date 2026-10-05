import { ArrowUpRight, BookOpen, CalendarDays, Clock3, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Exam } from '../examTypes'
import { formatExamDate, formatExamTime, getExamUrgency } from '../examUtils'
import CountdownBadge from './CountdownBadge'
import ExamTypeBadge from './ExamTypeBadge'

interface Props { exam: Exam; courseName?: string; now: Date; onOpen: () => void; onEdit: () => void; onDelete: () => void }

export default function ExamCard({ exam, courseName, now, onOpen, onEdit, onDelete }: Props) {
  return <article className={`exam-card exam-urgency-${getExamUrgency(exam, now)}`}>
    <button type="button" className="exam-card-main" onClick={onOpen} aria-label={`查看考试 ${exam.title}`}>
      <span className="exam-card-top"><ExamTypeBadge type={exam.examType} /><ArrowUpRight size={18} aria-hidden="true" /></span>
      <h3>{exam.title}</h3>
      <span className="exam-card-meta">{courseName && <span><BookOpen size={14} aria-hidden="true" />{courseName}</span>}<span><CalendarDays size={14} aria-hidden="true" />{formatExamDate(exam)}</span>{(exam.startTime || exam.endTime) && <span><Clock3 size={14} aria-hidden="true" />{formatExamTime(exam)}</span>}{exam.location && <span><MapPin size={14} aria-hidden="true" />{exam.location}</span>}</span>
      {exam.note && <span className="exam-card-note">{exam.note}</span>}
    </button>
    <div className="exam-card-status"><CountdownBadge exam={exam} now={now} /></div>
    <footer className="exam-card-actions"><button type="button" className="exam-view-action" onClick={onOpen}>查看详情<ArrowUpRight size={15} aria-hidden="true" /></button><div><button type="button" className="icon-button" aria-label={`编辑考试 ${exam.title}`} onClick={onEdit}><Pencil size={17} aria-hidden="true" /></button><button type="button" className="icon-button" aria-label={`删除考试 ${exam.title}`} onClick={onDelete}><Trash2 size={17} aria-hidden="true" /></button></div></footer>
  </article>
}
