import { useEffect, useRef } from 'react'
import { Coffee, Plus } from 'lucide-react'
import type { Course, Weekday } from '../courseTypes'
import { coursesForDay, WEEKDAYS } from '../courseUtils'
import CourseCard from './CourseCard'
interface MobileScheduleProps { courses: Course[]; today: Weekday | null; selectedDay: Weekday; now: Date; onSelect: (day: Weekday) => void; onOpen: (course: Course) => void; onAdd: (day: Weekday) => void }
export default function MobileSchedule({ courses, today, selectedDay, now, onSelect, onOpen, onAdd }: MobileScheduleProps) {
  const items = coursesForDay(courses, selectedDay)
  const switcher = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const revealSelection = () => {
      const container = switcher.current
      const button = container?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      if (!container || !button || !container.clientWidth) return
      const area = container.getBoundingClientRect()
      const selection = button.getBoundingClientRect()
      if (selection.left < area.left || selection.right > area.right) container.scrollLeft += selection.left - area.left - (container.clientWidth - selection.width) / 2
    }
    revealSelection()
    window.addEventListener('resize', revealSelection)
    return () => window.removeEventListener('resize', revealSelection)
  }, [selectedDay])
  return <div className="mobile-schedule"><div ref={switcher} className="weekday-switcher" role="group" aria-label="选择星期">{WEEKDAYS.map(day => <button type="button" key={day.value} aria-pressed={selectedDay === day.value} className={`weekday-button${selectedDay === day.value ? ' selected' : ''}`} onClick={() => onSelect(day.value)}><strong>{day.label}</strong><small>{day.value === today ? '今天' : `${coursesForDay(courses, day.value).length} 节`}</small></button>)}</div>
    <div className="selected-day-heading"><h3>{WEEKDAYS.find(day => day.value === selectedDay)?.label}的安排</h3><span>{items.length} 节课</span></div>
    {items.length ? <div className="mobile-course-list">{items.map(course => <CourseCard key={course.id} course={course} now={now} isToday={selectedDay === today} onOpen={onOpen} />)}</div>
      : <div className="selected-day-empty"><Coffee size={27} aria-hidden="true" /><p>这一天还没有课程安排</p><button type="button" className="secondary-button" onClick={() => onAdd(selectedDay)}><Plus size={17} aria-hidden="true" />添加课程</button></div>}
  </div>
}
