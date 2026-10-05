import { BookOpen } from 'lucide-react'
import type { StudyStats } from '../studyTypes'
import type { Semester } from '../../semester/semesterTypes'
import { formatDuration } from '../studyUtils'
export default function CourseStudyStats({stats,range,semesters}:{stats:StudyStats;range:'week'|'month';semesters:Semester[]}){
  const max=Math.max(1,...stats.courses.map(c=>c.minutes))
  return <section className="study-panel course-study-stats" aria-label="课程学习统计"><header className="study-panel-heading"><div><span className="eyebrow">TIME WELL SPENT</span><h2><BookOpen size={19} aria-hidden="true" />课程学习分布</h2></div><span className="study-tag">{range==='week'?'本周':'本月'}</span></header>
    {stats.courses.length?<ul>{stats.courses.map((course,index)=><li key={course.id??'other'} className={`tone-${['blue','cyan','purple','pink','orange'][index%5]}`}><div><span><strong>{course.name}</strong>{course.semesterId&&<small>{semesters.find(s=>s.id===course.semesterId)?.name}</small>}</span><b>{formatDuration(course.minutes)}</b></div><div className="study-progress-track" role="meter" aria-label={course.name} aria-valuenow={course.minutes} aria-valuemin={0} aria-valuemax={max} aria-valuetext={formatDuration(course.minutes)}><span style={{width:`${course.minutes/max*100}%`}} /></div></li>)}</ul>:<div className="study-small-empty"><BookOpen size={28} aria-hidden="true" /><p>还没有课程学习数据</p><small>关联课程后，时间会按课程分别统计；其他学习也会计入总时长。</small></div>}
  </section>
}
