import { CalendarDays, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { useCourses } from '../useCourses'
import { todaySummary } from '../courseUtils'
import { calculateCurrentWeek, weekStatusLabel } from '../../semester/weekUtils'
import { selectDefaultSemester } from '../../semester/semesterUtils'
export default function DashboardCourses({ now }: { now: Date }) {
  const { data:snapshot, storageError } = useCourses()
  const semester=selectDefaultSemester(snapshot.semesters,now).semester
  const data={semester,courses:snapshot.courses.filter(course=>course.semesterId === semester?.id)}
  const { today, ongoing, next, finished } = todaySummary(data.courses, now, data.semester)
  const state = calculateCurrentWeek(data.semester, now)
  return <article className="dashboard-card dashboard-courses tone-blue" aria-labelledby="dashboard-courses-title"><div className="card-top"><h3 id="dashboard-courses-title">今日课程</h3><span className="card-icon"><CalendarDays size={21} strokeWidth={1.7} aria-hidden="true" /></span></div><p className="card-value numeric">{today.length}<span className="card-unit">节</span></p>
    {storageError ? <p className="dashboard-course-error">课程数据暂时无法读取</p> : next ? <div className="dashboard-next-course"><strong>下一节：{next.name}</strong><p>{next.startTime} · {next.classroom || '教室待定'}</p>{ongoing.length > 0 && <small>正在上课：{ongoing.map(item => item.name).join('、')}</small>}</div>
      : <p className="card-description">{state.status !== 'active' ? weekStatusLabel(state) : finished ? '今天的课程已经结束。' : ongoing.length ? `正在上课：${ongoing.map(item => item.name).join('、')}` : '今天没有课程。'}</p>}
    <Link className="dashboard-course-link" to="/schedule">查看今日安排<ArrowUpRight size={13} aria-hidden="true" /></Link></article>
}
