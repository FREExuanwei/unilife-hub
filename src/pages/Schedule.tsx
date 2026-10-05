import { useState } from 'react'
import { CalendarDays, Plus, BookOpen, Sparkles, CalendarRange, Pencil } from 'lucide-react'
import { useCurrentDate } from '../hooks/useCurrentDate'
import { useCourses } from '../features/courses/useCourses'
import type { Course, Weekday } from '../features/courses/courseTypes'
import { sortCourses, todaySummary, weekdayOf } from '../features/courses/courseUtils'
import WeeklySchedule from '../features/courses/components/WeeklySchedule'
import MobileSchedule from '../features/courses/components/MobileSchedule'
import TodayCourses from '../features/courses/components/TodayCourses'
import CourseCard from '../features/courses/components/CourseCard'
import CourseDialogs from '../features/courses/components/CourseDialogs'
import type { CourseDialog } from '../features/courses/components/CourseDialogs'
import SemesterModal from '../features/semester/components/SemesterModal'
import WeekNavigator from '../features/semester/components/WeekNavigator'
import { calculateCurrentWeek, isCourseActiveInWeek, weekStatusLabel } from '../features/semester/weekUtils'
import { useViewedSemester } from '../features/semester/useViewedSemester'
import SemesterSelector from '../features/semester/components/SemesterSelector'
import type { Semester } from '../features/semester/semesterTypes'

export default function Schedule() {
  const now = useCurrentDate()
  const {semester,automatic,onSelect}=useViewedSemester(now)
  return <ScheduleView key={semester?.id??'empty'} semester={semester} isWithin={automatic.isWithin} onSelect={onSelect} now={now} />
}
function ScheduleView({semester,isWithin,onSelect,now}:{semester:Semester|null;isWithin:boolean;onSelect:(id:string)=>void;now:Date}) {
  const { data:snapshot, storageError } = useCourses()
  const data={semester,courses:snapshot.courses.filter(item=>item.semesterId === semester?.id || (!semester && item.semesterId === null))}
  const today = weekdayOf(now)
  const state = calculateCurrentWeek(data.semester, now)
  const [dayChoice, setDayChoice] = useState<{ day: Weekday; date: string } | null>(null)
  const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  const selectedDay = dayChoice?.date === dateKey ? dayChoice.day : today
  const selectDay = (day: Weekday) => setDayChoice({ day, date: dateKey })
  const [mode, setMode] = useState<'week' | 'all'>('week')
  const [weekChoice, setWeekChoice] = useState<number | null>(null)
  const totalWeeks = data.semester?.totalWeeks ?? 0
  const viewedWeek = weekChoice === null ? state.week : Math.min(weekChoice, totalWeeks)
  const [dialog, setDialog] = useState<CourseDialog | null>(null)
  const [semesterOpen, setSemesterOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const todayCourses = todaySummary(data.courses, now, data.semester).today
  const weekCourses = data.courses.filter(course => isCourseActiveInWeek(course, viewedWeek))
  const currentCourses = data.courses.filter(course => isCourseActiveInWeek(course, state.week))
  const add = (day: Weekday) => data.semester ? setDialog({ mode: 'add', day }) : setSemesterOpen(true)
  const open = (course: Course) => setDialog({ mode: 'details', id: course.id })
  const goToday = () => { setMode('week'); setWeekChoice(null); selectDay(today) }
  const isActualWeek = state.status === 'active' && viewedWeek === state.week
  return <div className="schedule-page">
    <div className="schedule-heading"><div><p className="eyebrow">EVERY WEEK HAS ITS OWN RHYTHM</p><h1>课程表 <span className="schedule-title-icon"><CalendarDays size={24} aria-hidden="true" /></span></h1><p>按学期与周次，安排真正属于这一周的课程。</p></div><div className="schedule-heading-actions"><button type="button" className="secondary-button" onClick={() => setSemesterOpen(true)}><CalendarRange size={17} aria-hidden="true" />学期设置</button>{data.semester && <button type="button" className="primary-button" onClick={() => add(selectedDay)}><Plus size={18} aria-hidden="true" />添加课程</button>}</div></div>
    {storageError && <p className="storage-notice" role="alert">{storageError}</p>}
    <p className="bookmark-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
    <SemesterSelector semester={semester} onSelect={onSelect} isWithin={isWithin} onFeedback={setFeedback} />
    {!data.semester ? <section className="semester-onboarding"><span className="semester-card-icon"><CalendarRange size={36} aria-hidden="true" /></span><p className="eyebrow">A FRESH START</p><h2>从你的学期开始。</h2><p>课程表现在支持按学期周次管理，请先设置本学期信息。</p>{data.courses.length > 0 && <p className="semester-migration-note">已有 {data.courses.length} 门课程已完整保留。设置学期后，旧课程将按整个学期每周上课迁移。</p>}<button type="button" className="primary-button" onClick={() => setSemesterOpen(true)}><Pencil size={17} aria-hidden="true" />设置学期</button></section>
      : <>
        <div className="semester-strip"><CalendarRange size={23} aria-hidden="true" /><div><strong>{data.semester.name}</strong><span>{data.semester.startDate} 开始 · 共 {totalWeeks} 周</span></div><span className="semester-status-pill">{weekStatusLabel(state)}</span></div>
        <div className="schedule-summary"><div className="schedule-stat tone-blue"><span><BookOpen size={20} aria-hidden="true" /></span><div><small>本周课程</small><strong>{currentCourses.length}<em>节</em></strong></div></div><div className="schedule-stat tone-orange"><span><CalendarDays size={20} aria-hidden="true" /></span><div><small>今天课程</small><strong>{todayCourses.length}<em>节</em></strong></div></div><div className="schedule-summary-note"><Sparkles size={18} aria-hidden="true" /><span>有计划，也有自由。<small>不同周次，不同节奏。</small></span></div></div>
        <TodayCourses courses={todayCourses} now={now} onOpen={open} emptyMessage={state.status === 'active' ? undefined : weekStatusLabel(state)} />
        <section className="schedule-board" aria-labelledby="schedule-board-title">
          <div className="schedule-view-toolbar"><div className="segmented-control schedule-tabs" role="group" aria-label="课程查看模式"><button type="button" aria-pressed={mode === 'week'} className={mode === 'week' ? 'selected' : ''} onClick={goToday}>本周课程</button><button type="button" aria-pressed={mode === 'all'} className={mode === 'all' ? 'selected' : ''} onClick={() => setMode('all')}>全部课程 <span>{data.courses.length}</span></button></div>{mode === 'week' && <WeekNavigator week={viewedWeek} totalWeeks={totalWeeks} currentWeek={state.week} onSelect={setWeekChoice} onToday={goToday} />}</div>
          <div className="schedule-board-heading"><div><h2 id="schedule-board-title">{mode === 'all' ? '整个学期的课程' : viewedWeek ? `第 ${viewedWeek} 周的安排` : weekStatusLabel(state)}</h2><p>{mode === 'all' ? '所有已保存课程 · 包含本周不上课与待安排的课程' : viewedWeek ? `${isActualWeek ? '本周 · ' : ''}${weekCourses.length} 节课 · 按开始时间排序` : '选择指定周次，仍可浏览整个学期的安排。'}</p></div></div>
          {mode === 'all' ? data.courses.length > 0 ? <div className="all-courses-grid">{sortCourses(data.courses).map(course => <div className="all-course-wrap" key={course.id}><span className="all-course-weekday">{['周一','周二','周三','周四','周五','周六','周日'][course.weekday-1]}</span><CourseCard course={course} now={now} isToday={false} onOpen={open} /></div>)}</div> : <div className="schedule-empty"><h3>还没有添加课程</h3><p>添加第一门课程，开始安排你的大学生活。</p><button type="button" className="primary-button" onClick={() => add(today)}><Plus size={18} aria-hidden="true" />添加第一门课程</button></div>
            : viewedWeek === null ? <div className="week-inactive"><CalendarRange size={34} aria-hidden="true" /><p>{weekStatusLabel(state)}</p><span>使用上方周次选择器查看第 1～{totalWeeks} 周。</span></div>
              : <><WeeklySchedule courses={weekCourses} today={isActualWeek ? today : null} now={now} onOpen={open} onAdd={add} /><MobileSchedule courses={weekCourses} today={isActualWeek ? today : null} now={now} selectedDay={selectedDay} onSelect={selectDay} onOpen={open} onAdd={add} /></>}
        </section>
        <p className="schedule-footnote">学期与课程保存在当前浏览器中 · 今日课程始终按真实日期计算</p>
      </>}
    <CourseDialogs semesterId={semester?.id??null} dialog={dialog} setDialog={setDialog} onSaved={(message, day) => { setFeedback(message); if (day) selectDay(day) }} />
    {semesterOpen && <SemesterModal semesterId={semester?.id} onClose={() => setSemesterOpen(false)} onSaved={id => { if(id)onSelect(id);setFeedback('学期设置已保存，课程安排已更新。') }} />}
  </div>
}
