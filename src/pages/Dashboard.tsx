import { CalendarDays, Timer, ChartNoAxesCombined, Bookmark, Plus, ArrowRight, GraduationCap, BookOpen, Sparkles, Leaf, Sprout } from 'lucide-react'
import { Link } from 'react-router'
import QuickAction from '../components/QuickAction'
import { useCurrentDate } from '../hooks/useCurrentDate'
import DashboardBookmarks from '../features/bookmarks/components/DashboardBookmarks'
import DashboardCourses from '../features/courses/components/DashboardCourses'
import SemesterBadge from '../features/semester/components/SemesterBadge'
import DashboardTasks, { RecentTasks } from '../features/tasks/components/DashboardTasks'
import DashboardExams from '../features/exams/DashboardExams'
import DashboardStudy from '../features/study/DashboardStudy'

export default function Dashboard() {
  const date = useCurrentDate()
  const dateLabel = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date)
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  return (
    <div className="dashboard">
      <div className="page-intro"><div><h1>你好 <span className="greeting-emoji">👋</span></h1><p>欢迎回到 UniLife Hub</p></div><time className="date-display" dateTime={localDate}><CalendarDays size={17} aria-hidden="true" />{dateLabel}</time></div>
      <SemesterBadge now={date} />
      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-copy"><span className="welcome-label"><span />YOUR LIFE, YOUR PACE</span><h2 id="welcome-title">让大学生活，<br />多一点从容。</h2><p>学习有计划，生活有节奏。<br className="mobile-break" />从这里，开启属于你的每一天。</p><Link to="/schedule" className="welcome-link">查看今日课程<ArrowRight size={17} aria-hidden="true" /></Link></div>
        <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-center"><GraduationCap size={78} strokeWidth={1.2} /></div><div className="art-float art-book"><BookOpen size={31} strokeWidth={1.4} /></div><div className="art-float art-sprout"><Sprout size={29} strokeWidth={1.4} /></div><Sparkles className="art-sparkles" size={27} strokeWidth={1.2} /><span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-label">a little more balance.</span></div>
      </section>
      <section className="overview-section" aria-labelledby="overview-title"><div className="section-heading"><h2 id="overview-title">今日概览</h2><span>一点一滴，心中有数</span></div><div className="dashboard-grid">
        <DashboardCourses now={date} />
        <DashboardTasks now={date} />
        <DashboardExams now={date} />
        <DashboardStudy now={date} />
      </div></section>
      <section className="quick-section" aria-labelledby="quick-title"><div className="section-heading"><h2 id="quick-title">快捷访问</h2><span>常用功能，一步到达</span></div><div className="quick-grid">
        <QuickAction title="查看课程表" description="把握每一天的安排" to="/schedule" icon={CalendarDays} tone="blue" />
        <QuickAction title="添加待办" description="给想做的事一个位置" to="/tasks?action=add" icon={Plus} tone="orange" />
        <QuickAction title="网站收藏" description="好用的网站，随手找到" to="/bookmarks" icon={Bookmark} tone="pink" />
        <QuickAction title="考试倒计时" description="下一场考试，从容准备" to="/exams" icon={Timer} tone="purple" />
        <QuickAction title="学习记录" description="看见每一份专注与成长" to="/statistics" icon={ChartNoAxesCombined} tone="cyan" />
      </div></section>
      <DashboardBookmarks />
      <RecentTasks now={date} />
      <aside className="gentle-note"><span className="note-icon"><Leaf size={23} strokeWidth={1.5} aria-hidden="true" /></span><div><strong>不必把每一天都填满。</strong><p>留一点时间给散步、发呆，和你喜欢的生活。</p></div><span className="note-tag">MAKE ROOM FOR LIFE</span></aside>
    </div>
  )
}
