import { useEffect, useState } from 'react'

export function useCurrentDate() {
  const [date, setDate] = useState(() => new Date())
  useEffect(() => {
    const update = () => setDate(new Date())
    const timer = window.setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return date
}
