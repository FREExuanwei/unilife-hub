import { Clock3, MapPin, UserRound, CalendarDays, Pencil, Trash2, BookOpen } from 'lucide-react'
import type { Course } from '../courseTypes'
import { WEEKDAYS } from '../courseUtils'
import { formatWeeks } from '../../semester/weekUtils'
import { Link } from 'react-router'
import { useTasks } from '../../tasks/useTasks'
import RelatedCourseExam from '../../exams/RelatedCourseExam'
export default function CourseDetails({ course, onEdit, onDelete }: { course: Course; onEdit: () => void; onDelete: () => void }) {
  const {tasks}=useTasks()
  const related=tasks.filter(item=>item.courseId === course.id)
  return <div className={`course-details course-tone-${course.color}`}><div className="course-details-banner"><span><BookOpen size={28} aria-hidden="true" /></span><h3>{course.name}</h3></div>
    <dl><div><dt><CalendarDays size={17} aria-hidden="true" />星期</dt><dd>{WEEKDAYS.find(day => day.value === course.weekday)?.label}</dd></div><div><dt><CalendarDays size={17} aria-hidden="true" />上课周次</dt><dd>{formatWeeks(course.weeks)}</dd></div><div><dt><Clock3 size={17} aria-hidden="true" />时间</dt><dd>{course.startTime}–{course.endTime}</dd></div><div><dt><UserRound size={17} aria-hidden="true" />教师</dt><dd>{course.teacher || '暂未填写'}</dd></div><div><dt><MapPin size={17} aria-hidden="true" />教室</dt><dd>{course.classroom || '暂未填写'}</dd></div></dl>
    <div className="course-details-note"><h4>备注</h4><p>{course.note || '还没有备注。'}</p></div><RelatedCourseExam courseId={course.id} /><Link className="related-assignments" to={`/tasks?course=${encodeURIComponent(course.id)}`}><span>相关作业：{related.length} 项</span><span>查看作业 →</span></Link><footer className="form-actions"><button type="button" className="secondary-button course-delete-button" onClick={onDelete}><Trash2 size={17} aria-hidden="true" />删除课程</button><button type="button" className="primary-button" onClick={onEdit}><Pencil size={17} aria-hidden="true" />编辑课程</button></footer>
  </div>
}
