import { Sun, MapPin, ArrowUpRight } from 'lucide-react'
import type { Course } from '../courseTypes'
import { courseStatus, STATUS_LABELS } from '../courseUtils'
export default function TodayCourses({ courses, now, onOpen, emptyMessage = '今天没有课程，好好休息一下。' }: { courses: Course[]; now: Date; onOpen: (course: Course) => void; emptyMessage?: string }) {
  return <section className="today-courses" aria-labelledby="today-courses-title"><header><div><span className="today-section-icon"><Sun size={21} aria-hidden="true" /></span><div><h2 id="today-courses-title">今日课程</h2><p>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)}</p></div></div><span className="today-count">{courses.length} 节课</span></header>
    {courses.length ? <div className="today-course-grid">{courses.map(course => <button type="button" key={course.id} className={`today-course-item course-tone-${course.color}`} onClick={() => onOpen(course)} aria-label={`今日课程 ${course.name}`}><span className="today-item-top"><strong>{course.startTime}–{course.endTime}</strong><span className={`course-status status-${courseStatus(course, now)}`}>{STATUS_LABELS[courseStatus(course, now)]}</span></span><strong className="today-item-name">{course.name}</strong><span className="today-item-location"><MapPin size={13} aria-hidden="true" />{course.classroom || '教室待定'}<ArrowUpRight size={15} aria-hidden="true" /></span></button>)}</div>
      : <p className="today-courses-empty">{emptyMessage}</p>}
  </section>
}
