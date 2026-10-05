import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../../../components/Modal'
import { useCourses } from '../../courses/useCourses'
import type { Semester } from '../semesterTypes'
export default function SemesterDeleteModal({semester,onClose,onDeleted}:{semester:Semester;onClose:()=>void;onDeleted:()=>void}) {
  const {data,deleteSemester}=useCourses()
  const [confirmed,setConfirmed]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const courses=data.courses.filter(item=>item.semesterId === semester.id)
  const tasks=data.tasks.filter(item=>item.semesterId === semester.id)
  const exams=data.exams.filter(item=>item.semesterId === semester.id)
  const studies=data.studyRecords.filter(item=>item.semesterId === semester.id)
  const [target,setTarget]=useState('')
  const targets=data.semesters.filter(item=>item.id !== semester.id)
  const targetValid=targets.some(item=>item.id === target)
  const signature=JSON.stringify([semester,courses,tasks,exams,studies,data.pomodoro.state,target])
  const [acknowledged,setAcknowledged]=useState('')
  const last=data.semesters.length<=1
  return <Modal title="删除学期" compact onClose={onClose}><div className="delete-confirmation"><span className="delete-confirmation-icon"><Trash2 size={26} aria-hidden="true" /></span><h3>确定删除《{semester.name}》吗？</h3>
    {last ? <p>至少需要保留一个学期。</p> : <><p>该学期包含 {courses.length} 门课程，删除学期将同时删除这些课程。</p><p>该学期的 {tasks.length} 项任务将保留为全局待办，解除学期与课程关联，完成状态和截止时间保持不变。</p>{studies.length>0 && <p>关联的 {studies.length} 条学习记录会全部保留，仅解除学期与课程关联，原课程名称、日期和时长保持不变。</p>}{data.pomodoro.state.semesterId===semester.id && <p>当前专注计时将继续，仅解除学期和课程关联。</p>}{exams.length>0 && <div className="semester-exam-protection"><p>该学期包含 {exams.length} 场考试。考试将全部保留并迁移到你选择的学期，解除原课程关联，日期和考试信息保持不变。</p><label>考试迁移到<select value={target} onChange={event=>{setTarget(event.target.value);setConfirmed(false);setAcknowledged('')}}><option value="">请选择另一个学期</option>{targets.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className="field-hint">迁移后考试日期可能超出新学期范围，考试仍会保留，可随后编辑。</p></div>}<label className="delete-ack"><input type="checkbox" checked={confirmed && acknowledged === signature} onChange={event=>{setConfirmed(event.target.checked);setAcknowledged(event.target.checked?signature:'')}} />我已了解课程将删除、任务将保留{exams.length>0?'、考试将迁移并保留':''}{studies.length>0?'、学习记录将保留':''}，确认删除学期</label></>}
    {error && <p className="field-error" role="alert">{error}</p>}<footer className="form-actions"><button type="button" className="secondary-button" autoFocus onClick={onClose}>取消</button><button type="button" className="danger-button" disabled={last || !confirmed || acknowledged !== signature || (exams.length>0 && !targetValid)} onClick={async ()=>{const result=await deleteSemester(semester.id,target||undefined);setError(result);if(!result)onDeleted()}}>确认删除</button></footer></div></Modal>
}
