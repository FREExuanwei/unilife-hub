import { useState } from 'react'
import { useCourses } from './useCourses'
import { unchangedRecord } from './editGuard'
type EditableList = 'semesters' | 'courses' | 'tasks' | 'exams' | 'studyRecords'
/** A draft belongs to the version shown when its form opened. */
export function useEditGuard(list: EditableList, id?: string) {
  const { data } = useCourses()
  const [original] = useState(() => data[list].find(item => item.id === id))
  return () => unchangedRecord(original, data[list].find(item => item.id === id))
}
