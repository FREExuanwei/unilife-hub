import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CourseData, CourseDraft } from './courseTypes'
import { CourseContext } from './CourseContext'
import { COURSE_STORAGE_KEY, readCourseStorage, writeCourseStorage } from './courseStorage'
import { findConflicts, validateCourse } from './courseUtils'
import type { SemesterDraft } from '../semester/semesterTypes'
import { affectedCourses, applySemester, findSemesterOverlaps, validateSemester } from '../semester/semesterUtils'
import type { TaskDraft } from '../tasks/taskTypes'
import { validateTask } from '../tasks/taskUtils'
import { withoutCourse, withoutSemester } from './hubTransactions'
import type { ExamDraft } from '../exams/examTypes'
import { isExamOutsideSemester, validateExam } from '../exams/examUtils'
import type { StudyDraft } from '../study/studyTypes'
import { studyCourseSnapshot, validateStudy } from '../study/studyUtils'
import type { PomodoroAction } from '../pomodoro/pomodoroTypes'
import { remainingTime, transitionPomodoro } from '../pomodoro/pomodoroUtils'
import { sameSnapshot, withHubLock } from './hubLock'
import { hasPendingRecovery } from '../backup/storageTransaction'
import { commitTimerWithReminder, deliverCompletionSound } from '../reminders/reminderCompletion'

export default function CourseProvider({children}:{children:ReactNode}) {
  const [initial]=useState(readCourseStorage)
  const [data,setData]=useState(initial.data)
  const [storageError,setStorageError]=useState(initial.error)
  const current=useRef(data)
  const readError=useRef(initial.error)
  const migrationAttempted=useRef(false)
  const checkingTimer=useRef(false)
  useEffect(()=>{
    if (initial.needsMigration && !migrationAttempted.current && !initial.error) {
      migrationAttempted.current=true
      // Re-read before migration so a newer snapshot from another tab is never replaced.
      void withHubLock(()=>{
        const loaded=readCourseStorage()
        if (loaded.error) {readError.current=loaded.error;setStorageError(loaded.error)}
        else {
          const error=loaded.needsMigration ? writeCourseStorage(loaded.data) : null
          current.current=loaded.data;setData(loaded.data);setStorageError(error)
        }
      }).catch(()=>setStorageError('数据迁移暂时无法保存，请刷新重试；原数据仍保留。'))
    }
    const resync=()=>{
      const before=current.current.pomodoro
      const loaded=readCourseStorage()
      current.current=loaded.data;readError.current=loaded.error;setData(loaded.data);setStorageError(loaded.error)
      if(!loaded.error&&!hasPendingRecovery(window.localStorage))void withHubLock(()=>deliverCompletionSound(before,loaded.data.pomodoro,Date.now())).then(error=>{if(error)setStorageError(error)}).catch(()=>setStorageError('声音提醒暂时不可用，页面完成提示仍会保留。'))
    }
    const sync=(event:StorageEvent)=>{
      if (event.storageArea !== window.localStorage || (event.key !== COURSE_STORAGE_KEY && event.key !== null)) return
      resync()
    }
    window.addEventListener('storage',sync)
    window.addEventListener('unilife:data-restored',resync)
    const checkTimer=()=>{
      const state=current.current.pomodoro.state
      if(readError.current || checkingTimer.current || state.status!=='running' || remainingTime(state,Date.now())>0)return
      checkingTimer.current=true
      void timerAction({type:'complete',cycleId:state.cycleId!}).finally(()=>{checkingTimer.current=false})
    }
    const timer=window.setInterval(checkTimer,1000)
    document.addEventListener('visibilitychange',checkTimer)
    checkTimer()
    return ()=>{window.removeEventListener('storage',sync);window.removeEventListener('unilife:data-restored',resync);window.clearInterval(timer);document.removeEventListener('visibilitychange',checkTimer)}
  },[initial])
  function commitLocked(next:CourseData,base:CourseData) {
    if(hasPendingRecovery(window.localStorage))return '数据恢复尚未完成，请重新加载后重试。'
    if (readError.current) return readError.current
    const latest=readCourseStorage()
    if(latest.error){readError.current=latest.error;setStorageError(latest.error);return latest.error}
    if(!sameSnapshot(latest.data,base)){
      const reminderError=deliverCompletionSound(current.current.pomodoro,latest.data.pomodoro,Date.now())
      if(reminderError)setStorageError(reminderError)
      current.current=latest.data;setData(latest.data)
      return '数据已在另一页面更新，请检查当前内容后重试。'
    }
    const error=writeCourseStorage(next)
    setStorageError(error)
    if (error) return error
    current.current=next;setData(next);return null
  }
  async function commit(next:CourseData):Promise<string|null>{
    const base=current.current
    try{return await withHubLock(()=>commitLocked(next,base))}catch{return '保存暂时失败，请保留输入并重试。'}
  }
  async function saveCourse(draft:CourseDraft,id?:string,allowConflict=false) {
    const snapshot=current.current
    const semester=snapshot.semesters.find(item=>item.id === draft.semesterId)
    if (!semester) return '请先设置或选择有效学期。'
    const old=id ? snapshot.courses.find(item=>item.id === id) : undefined
    if (id && !old) return '这门课程已被删除，请关闭表单后重试。'
    if (old && old.semesterId !== draft.semesterId) return '编辑课程不能移动所属学期，请在目标学期新建课程。'
    const error=Object.values(validateCourse(draft,semester.totalWeeks))[0]
    if (error) return error
    if (!allowConflict && findConflicts(draft,snapshot.courses.filter(item=>item.semesterId === semester.id),id).length) return '该课程与已有课程时间冲突，请确认冲突后再保存。'
    const values={...draft,name:draft.name.trim(),teacher:draft.teacher.trim(),classroom:draft.classroom.trim(),note:draft.note.trim()}
    const courses=id ? snapshot.courses.map(item=>item.id === id ? {...item,...values} : item) : [...snapshot.courses,{...values,id:crypto.randomUUID(),createdAt:new Date().toISOString()}]
    return commit({...snapshot,courses})
  }
  const deleteCourse=(id:string)=>commit(withoutCourse(current.current,id))
  async function saveSemester(draft:SemesterDraft,id?:string,confirmTrim=false) {
    const snapshot=current.current
    if (id && !snapshot.semesters.some(item=>item.id === id)) return '该学期已不存在，请关闭后重试。'
    const error=Object.values(validateSemester(draft))[0]
    if (error) return error
    const semester={...draft,id:id??crypto.randomUUID()}
    if (findSemesterOverlaps(semester,snapshot.semesters).length) return '该学期日期范围与已有学期重叠，请调整开始日期或总周数。'
    const courses=snapshot.courses.filter(item=>item.semesterId === id || (!snapshot.semesters.length && item.semesterId === null))
    if (!confirmTrim && affectedCourses(courses,draft.totalWeeks).length) return '部分课程包含超出新学期总周数的周次，请确认处理方式。'
    return commit(applySemester(snapshot,semester))
  }
  async function deleteSemester(id:string,targetSemesterId?:string) {
    if (!current.current.semesters.some(item=>item.id === id)) return '该学期已不存在。'
    if (current.current.semesters.length<=1) return '至少需要保留一个学期。'
    if (current.current.exams.some(exam=>exam.semesterId === id) && (!targetSemesterId || targetSemesterId === id || !current.current.semesters.some(item=>item.id === targetSemesterId))) return '该学期包含考试，请选择另一个学期以保留并迁移考试。'
    return commit(withoutSemester(current.current,id,targetSemesterId))
  }
  async function saveTask(draft:TaskDraft,id?:string) {
    const snapshot=current.current
    const old=id ? snapshot.tasks.find(item=>item.id === id) : undefined
    if (id && !old) return '任务已被删除，请关闭表单后重试。'
    const error=Object.values(validateTask(draft,snapshot.semesters,snapshot.courses))[0]
    if (error) return error
    const values:TaskDraft={type:draft.type,title:draft.title.trim(),description:draft.description.trim(),semesterId:draft.semesterId,courseId:draft.courseId,dueDate:draft.dueDate,dueTime:draft.dueTime,priority:draft.priority}
    const tasks=id ? snapshot.tasks.map(item=>item.id === id ? {...item,...values,...(values.courseId ? {associationNote:undefined} : {})} : item)
      : [...snapshot.tasks,{...values,id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'pending' as const,completedAt:null}]
    return commit({...snapshot,tasks})
  }
  async function toggleTask(id:string) {
    const snapshot=current.current
    if (!snapshot.tasks.some(item=>item.id === id)) return '任务已被删除。'
    return commit({...snapshot,tasks:snapshot.tasks.map(item=>item.id === id ? {...item,status:item.status === 'pending' ? 'completed' : 'pending',completedAt:item.status === 'pending' ? new Date().toISOString() : null} : item)})
  }
  const deleteTask=(id:string)=>commit({...current.current,tasks:current.current.tasks.filter(item=>item.id !== id)})
  async function saveExam(draft:ExamDraft,id?:string,confirmOutside=false) {
    const snapshot=current.current
    const old=id ? snapshot.exams.find(item=>item.id === id) : undefined
    if (id && !old) return '这场考试已被删除，请关闭表单后重试。'
    const error=Object.values(validateExam(draft,snapshot.semesters,snapshot.courses))[0]
    if (error) return error
    const semester=snapshot.semesters.find(item=>item.id === draft.semesterId)!
    if (!confirmOutside && isExamOutsideSemester(draft,semester)) return '该考试日期不在当前学期范围内，请确认后再保存。'
    const values:ExamDraft={semesterId:draft.semesterId,courseId:draft.courseId,title:draft.title.trim(),examType:draft.examType,examDate:draft.examDate,startTime:draft.startTime,endTime:draft.endTime,location:draft.location.trim(),seat:draft.seat.trim(),note:draft.note.trim()}
    const timestamp=new Date().toISOString()
    const exams=id ? snapshot.exams.map(item=>item.id === id ? {...item,...values,updatedAt:timestamp,...(values.courseId || values.semesterId !== item.semesterId ? {associationNote:undefined} : {})} : item)
      : [...snapshot.exams,{...values,id:crypto.randomUUID(),createdAt:timestamp,updatedAt:timestamp}]
    return commit({...snapshot,exams})
  }
  async function deleteExam(id:string) {
    const snapshot=current.current
    if (!snapshot.exams.some(item=>item.id === id)) return '这场考试已被删除。'
    return commit({...snapshot,exams:snapshot.exams.filter(item=>item.id !== id)})
  }
  async function saveStudy(draft:StudyDraft,id?:string){
    const snapshot=current.current,old=id?snapshot.studyRecords.find(r=>r.id===id):undefined
    if(id&&!old)return '这条学习记录已被删除，请关闭表单后重试。'
    const values:StudyDraft={title:draft.title.trim(),note:draft.note.trim(),date:draft.date,startTime:draft.startTime,endTime:draft.endTime,durationMinutes:draft.durationMinutes,courseId:draft.courseId,semesterId:draft.semesterId,courseNameSnapshot:studyCourseSnapshot(old,draft.courseId,snapshot.courses),source:old?.source??'manual'}
    if(old?.pomodoroCompleted!==undefined)values.pomodoroCompleted=old.pomodoroCompleted
    if(old?.segments&&old.startTime===values.startTime&&old.endTime===values.endTime&&old.durationMinutes===values.durationMinutes)values.segments=old.segments
    const error=Object.values(validateStudy(values,snapshot.semesters,snapshot.courses,new Date()))[0]
    if(error)return error
    const stamp=new Date().toISOString(),record={...values,id:id??crypto.randomUUID(),createdAt:old?.createdAt??stamp,updatedAt:stamp}
    return commit({...snapshot,studyRecords:old?snapshot.studyRecords.map(r=>r.id===id?record:r):[...snapshot.studyRecords,record]})
  }
  async function deleteStudy(id:string){
    const snapshot=current.current
    if(!snapshot.studyRecords.some(r=>r.id===id))return '这条学习记录已被删除。'
    return commit({...snapshot,studyRecords:snapshot.studyRecords.filter(r=>r.id!==id)})
  }
  async function timerAction(action:PomodoroAction):Promise<string|null>{
    if(!navigator.locks)return '此浏览器暂不支持安全恢复专注计时，请使用最新的现代浏览器；手动记录仍然可用。'
    try{return await withHubLock(()=>{
      if(hasPendingRecovery(window.localStorage))return '数据恢复尚未完成，请重新加载后重试。'
      const observedBefore=current.current.pomodoro
      const loaded=readCourseStorage()
      if(loaded.error){readError.current=loaded.error;setStorageError(loaded.error);return loaded.error}
      current.current=loaded.data;readError.current=null
      if(action.type==='start'&&action.courseId&&!loaded.data.courses.some(c=>c.id===action.courseId&&c.semesterId===action.semesterId))return '关联课程已变更，请重新选择。'
      if(action.type==='start'&&action.semesterId&&!loaded.data.semesters.some(s=>s.id===action.semesterId))return '学期已变更，请重新选择。'
      const result=transitionPomodoro(loaded.data.pomodoro,action,Date.now())
      if(result.error)return result.error
      if(result.pomodoro===loaded.data.pomodoro){const reminderError=deliverCompletionSound(observedBefore,loaded.data.pomodoro,Date.now());if(reminderError)setStorageError(reminderError);setData(loaded.data);return null}
      const studies=result.record&&!loaded.data.studyRecords.some(r=>r.id===result.record!.id)?[...loaded.data.studyRecords,result.record]:loaded.data.studyRecords
      const saved=commitTimerWithReminder(loaded.data.pomodoro,result.pomodoro,action,Date.now(),()=>commitLocked({...loaded.data,pomodoro:result.pomodoro,studyRecords:studies},loaded.data))
      if(saved.reminderError)setStorageError(saved.reminderError)
      return saved.storageError
    })}catch{return '专注状态保存失败，请保留页面并重试。'}
  }
  return <CourseContext.Provider value={{data,storageError,saveCourse,deleteCourse,saveSemester,deleteSemester,saveTask,deleteTask,toggleTask,saveExam,deleteExam,saveStudy,deleteStudy,timerAction}}>{children}</CourseContext.Provider>
}

