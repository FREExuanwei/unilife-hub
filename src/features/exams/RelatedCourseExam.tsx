import { Link } from 'react-router'
import { Timer, ArrowUpRight } from 'lucide-react'
import { useCourses } from '../courses/useCourses'
import { useCurrentDate } from '../../hooks/useCurrentDate'
import { nextExam, sortEndedExams, formatExamDate, getExamCountdown } from './examUtils'
export default function RelatedCourseExam({courseId}:{courseId:string}) {
  const {data} = useCourses()
  const now = useCurrentDate()
  const exams = data.exams.filter(item=>item.courseId === courseId)
  const upcoming = nextExam(exams,now)
  const exam = upcoming ?? sortEndedExams(exams)[0]
  return <section className="related-course-exam"><h4><Timer size={16} aria-hidden="true" />课程考试 <span>{exams.length} 场</span></h4>{exam ? <Link to={`/exams?exam=${encodeURIComponent(exam.id)}`}><div><strong>{upcoming?'最近考试':'最近历史考试'}：{exam.title}</strong><small>{formatExamDate(exam)} · {getExamCountdown(exam,now)}</small></div><ArrowUpRight size={17} aria-hidden="true" /></Link> : <p>还没有关联考试。</p>}</section>
}
