import type { Exam } from './examTypes.ts'
import type { Semester } from '../semester/semesterTypes.ts'
import type { Course } from '../courses/courseTypes.ts'
import { validateExam } from './examUtils.ts'
import { boundedList, pickFields } from '../../utils/dataShape.ts'

// The hub writes one snapshot so course/semester deletion and exam protection are atomic.
// This reader owns the exam schema independently from taskStorage.
export function readExams(value: unknown, semesters: Semester[], courses: Course[]): Exam[] {
  boundedList(value)
  const exams = value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw Error('Invalid exam')
    const item = raw as Record<string,unknown>
    if (!['id','semesterId','title','examType','examDate','location','seat','note','createdAt','updatedAt'].every(key=>typeof item[key] === 'string') || !item.id) throw Error('Invalid exam fields')
    if (!['courseId','startTime','endTime'].every(key=>item[key] === null || typeof item[key] === 'string')) throw Error('Invalid exam nullable fields')
    if (!Number.isFinite(Date.parse(item.createdAt as string)) || !Number.isFinite(Date.parse(item.updatedAt as string))) throw Error('Invalid exam timestamps')
    if (item.associationNote !== undefined && (typeof item.associationNote !== 'string' || item.associationNote.length > 500)) throw Error('Invalid exam association note')
    const exam = pickFields(item,['id','semesterId','courseId','title','examType','examDate','startTime','endTime','location','seat','note','createdAt','updatedAt','associationNote']) as unknown as Exam
    if (Object.keys(validateExam(exam,semesters,courses)).length) throw Error('Invalid exam values')
    return exam
  })
  if (new Set(exams.map(exam=>exam.id)).size !== exams.length) throw Error('Duplicate exam IDs')
  return exams
}
