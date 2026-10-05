import { Clock3, CalendarDays, CalendarRange, Flame } from 'lucide-react'
import type { StudyStats } from '../studyTypes'
import { formatDuration } from '../studyUtils'
export default function StudySummary({stats}:{stats:StudyStats}){
  const items=[{label:'今日学习',value:formatDuration(stats.today),hint:`今日完成 ${stats.todayPomodoros} 个番茄`,icon:Clock3,tone:'blue'},{label:'本周学习',value:formatDuration(stats.week),hint:`周一开始 · 已学习 ${stats.weekDays} 天`,icon:CalendarDays,tone:'cyan'},{label:'本月学习',value:formatDuration(stats.month),hint:'积少成多，每一分钟都算数',icon:CalendarRange,tone:'purple'},{label:'连续学习',value:`${stats.streak} 天`,hint:`历史最长 ${stats.longestStreak} 天`,icon:Flame,tone:'orange'}]
  return <section className="study-summary" aria-label="学习概览">{items.map(item=><article key={item.label} className={`study-summary-card tone-${item.tone}`}><span className="study-icon"><item.icon size={21} aria-hidden="true" /></span><p>{item.label}</p><strong>{item.value}</strong><small>{item.hint}</small></article>)}</section>
}
