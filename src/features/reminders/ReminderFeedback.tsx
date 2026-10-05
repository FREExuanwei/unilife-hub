import { useState } from 'react'
import { CheckCircle2, Coffee, X } from 'lucide-react'
import { useCourses } from '../courses/useCourses'

export default function ReminderFeedback() {
  const {data,timerAction}=useCourses(),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)
  const notice=data.pomodoro.notice
  if (!notice) return null
  const completed=notice.startsWith('专注完成')||notice.startsWith('休息结束'),rest=notice.startsWith('休息结束')
  async function dismiss(){setBusy(true);setError(await timerAction({type:'dismiss'}));setBusy(false)}
  return <aside className={`reminder-feedback${completed?' is-completion':''}`} aria-label={completed?'计时完成提醒':'计时提示'}>
    <div className="reminder-feedback-icon">{rest?<Coffee size={25} aria-hidden="true" />:<CheckCircle2 size={25} aria-hidden="true" />}</div>
    <div className="reminder-feedback-copy" role="status" aria-live="polite" aria-atomic="true"><strong>{rest?'休息结束，准备好再出发。':completed?'专注完成，给自己一个停顿。':'计时提示'}</strong><p>{notice}</p>{error&&<p className="form-save-error" role="alert">{error}</p>}</div>
    <button type="button" className="icon-button" aria-label="关闭全局计时提示" disabled={busy} onClick={()=>void dismiss()}><X size={18} aria-hidden="true" /></button>
  </aside>
}
