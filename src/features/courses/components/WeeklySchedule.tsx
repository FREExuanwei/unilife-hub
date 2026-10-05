import { Plus } from 'lucide-react'
import type { Course, Weekday } from '../courseTypes'
import { coursesForDay, WEEKDAYS } from '../courseUtils'
import CourseCard from './CourseCard'
interface ScheduleViewProps { courses: Course[]; today: Weekday | null; now: Date; onOpen: (course: Course) => void; onAdd: (day: Weekday) => void }
export default function WeeklySchedule({ courses, today, now, onOpen, onAdd }: ScheduleViewProps) {
  return <div className="weekly-schedule">{WEEKDAYS.map(day => {
    const items = coursesForDay(courses, day.value)
    return <section key={day.value} className={`day-column${day.value === today ? ' is-today' : ''}`} aria-label={`${day.label}课程`}>
      <header className="day-column-heading"><h3>{day.label}</h3>{day.value === today ? <span className="today-label">今天</span> : <small>{items.length} 节</small>}</header>
      <div className="day-column-courses">{items.map(course => <CourseCard key={course.id} course={course} now={now} isToday={day.value === today} onOpen={onOpen} />)}{!items.length && <p className="day-empty">留一点自由时间</p>}</div>
      <button type="button" className="day-add-button" onClick={() => onAdd(day.value)} aria-label={`为${day.label}添加课程`}><Plus size={16} aria-hidden="true" />添加</button>
    </section>
  })}</div>
}
