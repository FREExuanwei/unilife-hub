import { Pencil, Trash2 } from 'lucide-react'
import { useCourses } from '../../courses/useCourses'
import type { Exam } from '../examTypes'
import { formatExamDate } from '../examUtils'
import CountdownBadge from './CountdownBadge'
import ExamTypeBadge from './ExamTypeBadge'

export default function ExamDetails({ exam, now, onEdit, onDelete }: { exam: Exam; now: Date; onEdit: () => void; onDelete: () => void }) {
  const { data } = useCourses()
  return <div className="exam-details"><div className="exam-details-banner"><ExamTypeBadge type={exam.examType} /><h3>{exam.title}</h3><CountdownBadge exam={exam} now={now} /></div>
    <dl><div><dt>所属学期</dt><dd>{data.semesters.find(semester => semester.id === exam.semesterId)?.name ?? '学期已变更'}</dd></div><div><dt>关联课程</dt><dd>{data.courses.find(course => course.id === exam.courseId)?.name ?? '未关联课程'}</dd></div><div><dt>考试日期</dt><dd>{formatExamDate(exam)}</dd></div><div><dt>开始时间</dt><dd>{exam.startTime ?? '未设置'}</dd></div><div><dt>结束时间</dt><dd>{exam.endTime ?? '未设置'}</dd></div><div><dt>考试地点</dt><dd>{exam.location || '未填写'}</dd></div>{exam.seat && <div><dt>座位号</dt><dd>{exam.seat}</dd></div>}</dl>
    {exam.associationNote && <p className="exam-association-note">{exam.associationNote}</p>}
    <div className="exam-note"><h4>备注</h4><p>{exam.note || '还没有补充备注。'}</p></div>
    <footer className="form-actions"><button type="button" className="secondary-button course-delete-button" onClick={onDelete}><Trash2 size={17} aria-hidden="true" />删除考试</button><button type="button" className="primary-button" onClick={onEdit}><Pencil size={17} aria-hidden="true" />编辑考试</button></footer>
  </div>
}
