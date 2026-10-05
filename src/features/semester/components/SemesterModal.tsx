import { useEffect, useState } from 'react'
import Modal from '../../../components/Modal'
import { useCourses } from '../../courses/useCourses'
import SemesterForm from './SemesterForm'
export default function SemesterModal({semesterId,onClose,onSaved}:{semesterId?:string;onClose:()=>void;onSaved?:(id?:string)=>void}) {
  const {data,saveSemester}=useCourses()
  const semester=data.semesters.find(item=>item.id === semesterId)??null
  const [created,setCreated]=useState(false)
  useEffect(()=>{
    if (created) {onSaved?.(data.semesters.at(-1)?.id);onClose()}
  },[created,data.semesters,onClose,onSaved])
  if (semesterId && !semester) return <Modal title="学期已变更" onClose={onClose}><p className="field-hint">该学期已在其他页面删除，请关闭后重试。</p></Modal>
  const courses=data.courses.filter(item=>semester ? item.semesterId === semester.id : !data.semesters.length && item.semesterId === null)
  return <Modal title={semester?'学期设置':'新建学期'} subtitle="让每一周的安排，都有自己的位置。" onClose={onClose}><SemesterForm semester={semester} semesters={data.semesters} courses={courses} onCancel={onClose} onSave={async (draft,confirmed)=>{
    const error=await saveSemester(draft,semester?.id,confirmed)
    if (!error) {if(semester){onSaved?.(semester.id);onClose()}else setCreated(true)}
    return error
  }} /></Modal>
}

