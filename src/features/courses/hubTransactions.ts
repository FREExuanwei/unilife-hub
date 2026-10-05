import type { CourseData } from './courseTypes.ts'
export function withoutCourse(data: CourseData, id: string): CourseData {
  const course=data.courses.find(item=>item.id === id)
  return {...data,courses:data.courses.filter(item=>item.id !== id),tasks:data.tasks.map(task=>task.courseId === id ? {...task,courseId:null,associationNote:`原关联课程「${course?.name ?? ''}」已删除`} : task),exams:data.exams.map(exam=>exam.courseId === id ? {...exam,courseId:null,updatedAt:new Date().toISOString(),associationNote:`原关联课程「${course?.name ?? ''}」已删除`} : exam),
    studyRecords:data.studyRecords.map(record=>record.courseId===id?{...record,courseId:null,courseNameSnapshot:record.courseNameSnapshot||course?.name||'',updatedAt:new Date().toISOString()}:record),
    pomodoro:data.pomodoro.state.courseId===id?{...data.pomodoro,state:{...data.pomodoro.state,courseId:null,courseNameSnapshot:data.pomodoro.state.courseNameSnapshot||course?.name||''}}:data.pomodoro}
}
export function withoutSemester(data: CourseData, id: string, targetSemesterId?: string): CourseData {
  const semester=data.semesters.find(item=>item.id === id)
  if (data.exams.some(exam=>exam.semesterId === id) && (!targetSemesterId || targetSemesterId === id || !data.semesters.some(item=>item.id === targetSemesterId))) throw Error('该学期包含考试，请选择另一个学期以保留并迁移考试。')
  return {...data,semesters:data.semesters.filter(item=>item.id !== id),courses:data.courses.filter(item=>item.semesterId !== id),tasks:data.tasks.map(task=>task.semesterId === id ? {...task,type:'todo',semesterId:null,courseId:null,associationNote:`原学期「${semester?.name ?? ''}」已删除，任务已保留为全局待办${task.courseId ? '，原关联课程已删除' : ''}`} : task),exams:data.exams.map(exam=>exam.semesterId === id ? {...exam,semesterId:targetSemesterId!,courseId:null,updatedAt:new Date().toISOString(),associationNote:`原学期「${semester?.name ?? ''}」已删除，考试已迁移并保留${exam.courseId ? '，原关联课程已删除' : ''}`} : exam),
    studyRecords:data.studyRecords.map(record=>record.semesterId===id?{...record,semesterId:null,courseId:null,courseNameSnapshot:record.courseNameSnapshot||data.courses.find(c=>c.id===record.courseId)?.name||'',updatedAt:new Date().toISOString()}:record),
    pomodoro:data.pomodoro.state.semesterId===id?{...data.pomodoro,state:{...data.pomodoro.state,semesterId:null,courseId:null,courseNameSnapshot:data.pomodoro.state.courseNameSnapshot||data.courses.find(c=>c.id===data.pomodoro.state.courseId)?.name||''}}:data.pomodoro}
}
