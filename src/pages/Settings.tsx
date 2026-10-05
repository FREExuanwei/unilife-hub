import { useState } from 'react'
import { CalendarRange, SlidersHorizontal, Pencil, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { useCourses } from '../features/courses/useCourses'
import { useCurrentDate } from '../hooks/useCurrentDate'
import { calculateCurrentWeek, weekStatusLabel } from '../features/semester/weekUtils'
import SemesterModal from '../features/semester/components/SemesterModal'
import SemesterSelector from '../features/semester/components/SemesterSelector'
import { useViewedSemester } from '../features/semester/useViewedSemester'
import DataManagement from '../features/backup/DataManagement'
import PwaSettings from '../features/pwa/PwaSettings'
import ReminderSettingsPanel from '../features/reminders/ReminderSettingsPanel'
export default function Settings() {
  const { data:snapshot, storageError } = useCourses()
  const now = useCurrentDate()
  const {semester,automatic,onSelect}=useViewedSemester(now)
  const data={courses:snapshot.courses.filter(item=>item.semesterId === semester?.id)}
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  return <div className="settings-page"><div className="schedule-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h1>设置 <span className="schedule-title-icon"><SlidersHorizontal size={23} aria-hidden="true" /></span></h1><p>学期、专注提醒与数据，让一切贴合你的生活。</p></div></div>
    {storageError && <p className="storage-notice" role="alert">{storageError}</p>}
    <p className="bookmark-feedback" role="status">{feedback}</p>
    <SemesterSelector semester={semester} onSelect={onSelect} isWithin={automatic.isWithin} onFeedback={setFeedback} />
    <section className="semester-settings-card"><div className="semester-card-top"><span className="semester-card-icon"><CalendarRange size={28} aria-hidden="true" /></span><span className="semester-status-pill">{weekStatusLabel(calculateCurrentWeek(semester,now))}</span></div><p className="eyebrow">YOUR SEMESTER</p><h2>{semester?.name ?? '为新学期，留一个起点。'}</h2><p className="semester-card-description">{semester ? '课程按上课周次自动筛选，你可以随时调整学期信息。' : '课程表现在支持按学期周次管理，请先设置本学期信息。'}</p>
      {semester && <dl className="semester-details"><div><dt>学期开始日期</dt><dd>{semester.startDate}</dd></div><div><dt>学期总周数</dt><dd>{semester.totalWeeks} <small>周</small></dd></div><div><dt>已保存课程</dt><dd>{data.courses.length} <small>门</small></dd></div></dl>}
      <div className="semester-card-actions"><button type="button" className="primary-button" onClick={() => setOpen(true)}><Pencil size={17} aria-hidden="true" />{semester ? '修改学期' : '设置学期'}</button><Link className="secondary-button" to="/schedule">查看课程表<ArrowUpRight size={17} aria-hidden="true" /></Link></div><p className="field-hint">仅保存在当前浏览器中 · 修改总周数前会检查受影响课程</p>
    </section>
    <ReminderSettingsPanel />
    <PwaSettings />
    <DataManagement />
    {open && <SemesterModal semesterId={semester?.id} onClose={() => setOpen(false)} onSaved={id=>{if(id)onSelect(id);setFeedback('学期设置已保存。')}} />}
  </div>
}
