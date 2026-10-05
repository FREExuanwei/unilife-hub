import { useCourses } from '../courses/useCourses'
export function useTasks() {
  const {data,storageError,saveTask,deleteTask,toggleTask}=useCourses()
  return {tasks:data.tasks,storageError,saveTask,deleteTask,toggleTask}
}
