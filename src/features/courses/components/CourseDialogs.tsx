import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import Modal from '../../../components/Modal'
import { useCourses } from '../useCourses'
import type { Course, Weekday } from '../courseTypes'
import CourseForm from './CourseForm'
import CourseDetails from './CourseDetails'
export type CourseDialog = { mode: 'add'; day: Weekday } | { mode: 'details' | 'edit' | 'delete'; id: string }
interface Props { semesterId:string|null; dialog: CourseDialog | null; setDialog: (dialog: CourseDialog | null) => void; onSaved: (courseName: string, day?: Weekday) => void }
export default function CourseDialogs({ semesterId, dialog, setDialog, onSaved }: Props) {
  const { data:snapshot, saveCourse, deleteCourse } = useCourses()
  const data={semester:snapshot.semesters.find(item=>item.id === semesterId),courses:snapshot.courses.filter(item=>item.semesterId === semesterId)}
  const linkedTasks=dialog && dialog.mode !== 'add' ? snapshot.tasks.filter(item=>item.courseId === dialog.id).length : 0
  const linkedExams=dialog && dialog.mode !== 'add' ? snapshot.exams.filter(item=>item.courseId === dialog.id).length : 0
  const linkedStudies=dialog && dialog.mode !== 'add' ? snapshot.studyRecords.filter(item=>item.courseId === dialog.id).length : 0
  const [error, setError] = useState<string | null>(null)
  if (!dialog) return null
  const close = () => { setDialog(null); setError(null) }
  const course: Course | undefined = dialog.mode === 'add' ? undefined : data.courses.find(item => item.id === dialog.id)
  if (dialog.mode !== 'add' && !course) return <Modal title="课程已变更" compact onClose={close}><p className="field-hint">这门课程已在其他页面被删除。</p><div className="form-actions"><button type="button" className="primary-button" onClick={close}>关闭</button></div></Modal>
  if ((dialog.mode === 'add' || dialog.mode === 'edit') && data.semester) return <Modal key={`${dialog.mode}-${course?.id ?? 'new'}`} title={dialog.mode === 'edit' ? '编辑课程' : '添加课程'} subtitle={`${data.semester.name} · 共 ${data.semester.totalWeeks} 周`} onClose={close}><CourseForm course={course} courses={data.courses} semesterId={data.semester.id} totalWeeks={data.semester.totalWeeks} defaultDay={dialog.mode === 'add' ? dialog.day : course!.weekday} onCancel={close} onSave={async (draft, confirmed) => {
    const result = await saveCourse(draft, dialog.mode === 'edit' ? course?.id : undefined, confirmed)
    if (!result) { onSaved(`已${dialog.mode === 'edit' ? '更新' : '添加'}《${draft.name.trim()}》`, draft.weekday); close() }
    return result
  }} /></Modal>
  if (dialog.mode === 'details' && course) return <Modal key={`details-${course.id}`} title="课程详情" onClose={close}><CourseDetails course={course} onEdit={() => setDialog({ mode: 'edit', id: course.id })} onDelete={() => { setError(null); setDialog({ mode: 'delete', id: course.id }) }} /></Modal>
  if (dialog.mode === 'delete' && course) return <Modal key={`delete-${course.id}`} title="删除课程" compact onClose={() => setDialog({ mode: 'details', id: course.id })}><div className="delete-confirmation"><span className="delete-confirmation-icon"><Trash2 size={26} aria-hidden="true" /></span><h3>确定删除《{course.name}》吗？</h3><p>删除后，这门课程会从学期安排和今日课程中移除。</p>{linkedTasks>0 && <p>关联的 {linkedTasks} 项作业会保留，仅解除课程关联并标记原课程已删除。</p>}{linkedExams>0 && <p>关联的 {linkedExams} 场考试会保留，仅解除课程关联并标记原课程已删除。</p>}{linkedStudies>0 && <p>关联的 {linkedStudies} 条学习记录会保留，解除课程关联并保留原课程名称。</p>}{snapshot.pomodoro.state.courseId===course.id && <p>当前专注计时会继续，原课程名称仍会保留。</p>}{error && <p className="field-error" role="alert">{error}</p>}<footer className="form-actions"><button type="button" className="secondary-button" autoFocus onClick={() => setDialog({ mode: 'details', id: course.id })}>取消</button><button type="button" className="danger-button" onClick={async () => { const result = await deleteCourse(course.id); setError(result); if (!result) { onSaved(`已删除《${course.name}》`); close() } }}>确认删除</button></footer></div></Modal>
  return <Modal title="请先设置学期" compact onClose={close}><p className="field-hint">学期信息已在其他页面发生变化，请关闭表单并重新设置学期。</p><div className="form-actions"><button type="button" className="primary-button" onClick={close}>关闭</button></div></Modal>
}
