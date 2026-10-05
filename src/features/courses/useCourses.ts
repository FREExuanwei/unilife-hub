import { useContext } from 'react'
import { CourseContext } from './CourseContext'
export function useCourses() {
  const value = useContext(CourseContext)
  if (!value) throw new Error('useCourses requires CourseProvider')
  return value
}
