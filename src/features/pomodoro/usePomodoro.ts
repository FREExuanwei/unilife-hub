import { useEffect, useState } from 'react'
import { useCourses } from '../courses/useCourses'
import { elapsedTime, remainingTime } from './pomodoroUtils'
export function usePomodoro(){
  const {data,timerAction,storageError}=useCourses(),[now,setNow]=useState(Date.now)
  useEffect(()=>{const update=()=>setNow(Date.now()),timer=window.setInterval(update,1000);document.addEventListener('visibilitychange',update);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',update)}},[])
  return {pomodoro:data.pomodoro,timerAction,remainingMs:remainingTime(data.pomodoro.state,now),elapsedMs:elapsedTime(data.pomodoro.state,now),now,storageError}
}
