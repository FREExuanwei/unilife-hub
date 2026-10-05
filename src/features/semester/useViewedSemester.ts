import { useState } from 'react'
import { useCourses } from '../courses/useCourses'
import { selectDefaultSemester } from './semesterUtils'
export function useViewedSemester(now: Date, initialId?:string|null) {
  const {data}=useCourses()
  const automatic=selectDefaultSemester(data.semesters,now)
  const [choice,setChoice]=useState<string|null>(initialId??null)
  const semester=data.semesters.find(item=>item.id === choice)??automatic.semester
  return {semester,automatic,onSelect:setChoice}
}
