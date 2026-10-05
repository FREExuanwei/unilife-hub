import { Clock3, MapPin, UserRound, ChevronRight } from 'lucide-react'
import type { Course } from '../courseTypes'
import { courseStatus, STATUS_LABELS } from '../courseUtils'
import { formatWeeks } from '../../semester/weekUtils'
export default function CourseCard({ course, now, isToday, onOpen }: { course: Course; now: Date; isToday: boolean; onOpen: (course: Course) => void }) {
  const status = courseStatus(course, now)
  return <button type="button" className={`course-card course-tone-${course.color}`} onClick={() => onOpen(course)} aria-label={`查看课程 ${course.name}`}>
    <span className="course-card-time"><Clock3 size={13} aria-hidden="true" />{course.startTime}–{course.endTime}</span><strong className="course-card-name">{course.name}</strong>
    <span className={`course-week-tag${!course.weeks.length ? ' needs-weeks' : ''}`} title={formatWeeks(course.weeks)}>{formatWeeks(course.weeks)}</span>
    <span className="course-card-meta" title={course.classroom || '教室待定'}><MapPin size={13} aria-hidden="true" /><span>{course.classroom || '教室待定'}</span></span><span className="course-card-meta" title={course.teacher || '教师待定'}><UserRound size={13} aria-hidden="true" /><span>{course.teacher || '教师待定'}</span></span>
    <span className="course-card-bottom">{isToday ? <span className={`course-status status-${status}`}>{STATUS_LABELS[status]}</span> : <span>查看详情</span>}<ChevronRight size={15} aria-hidden="true" /></span>
  </button>
}
