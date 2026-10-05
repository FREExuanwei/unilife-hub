import { useCourses } from '../courses/useCourses'
export function useStudy(){
  const {data,storageError,saveStudy,deleteStudy}=useCourses()
  return {records:data.studyRecords,courses:data.courses,semesters:data.semesters,storageError,saveStudy,deleteStudy}
}
