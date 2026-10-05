import { useCourses } from '../courses/useCourses'
export function useExams() {
  const {data,storageError,saveExam,deleteExam} = useCourses()
  return {exams:data.exams,storageError,saveExam,deleteExam}
}
