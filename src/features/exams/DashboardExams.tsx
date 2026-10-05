import { Timer, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { useCourses } from '../courses/useCourses'
import { selectDefaultSemester } from '../semester/semesterUtils'
import { nextExam, getExamCountdown, getExamUrgency, examDaysAway, formatExamDate, formatExamTime } from './examUtils'

export default function DashboardExams({now}:{now:Date}) {
  const {data,storageError} = useCourses()
  const current = selectDefaultSemester(data.semesters,now)
  const exam = current.isWithin ? nextExam(data.exams.filter(item=>item.semesterId === current.semester?.id),now) : undefined
  const urgent = exam && examDaysAway(exam,now) <= 3
  return <article className={`dashboard-card tone-purple dashboard-exams${urgent?' exam-home-urgent':''}`} aria-labelledby="dashboard-exams-title">
    <div className="card-top"><h3 id="dashboard-exams-title">最近考试</h3><span className="card-icon"><Timer size={21} strokeWidth={1.7} aria-hidden="true" /></span></div>
    <p className="card-value">{storageError?'暂时无法读取':exam?.title??'暂无考试'}</p>
    {exam ? <><p className={`exam-home-countdown exam-urgency-${getExamUrgency(exam,now)}`}>{getExamCountdown(exam,now)}</p><p className="card-description">{formatExamDate(exam)}{exam.startTime||exam.endTime ? ` · ${formatExamTime(exam)}` : ''}</p></> : <p className="card-description">{storageError?'现有数据不会被覆盖':'为下一个目标，慢慢准备'}</p>}
    <Link className="dashboard-course-link" to={exam?`/exams?exam=${encodeURIComponent(exam.id)}`:'/exams'}>{exam?'查看考试详情':'查看考试安排'}<ArrowUpRight size={13} aria-hidden="true" /></Link>
  </article>
}
