import { useId, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import type { StudyStats } from '../studyTypes'
import { formatDuration, localDate } from '../studyUtils'
import { parseLocalDate } from '../../semester/weekUtils'
export default function StudyTrendChart({stats,range,onRange,now}:{stats:StudyStats;range:'week'|'month';onRange:(range:'week'|'month')=>void;now:Date}){
  const id=useId(),[selected,setSelected]=useState(localDate(now))
  const selectedDay=stats.trend.find(day=>day.date===selected)??stats.trend[0]
  const max=Math.max(60,...stats.trend.map(day=>day.minutes)),width=700,height=180,gap=width/stats.trend.length
  return <section className="study-panel study-trend" aria-labelledby={`${id}-heading`}><header className="study-panel-heading"><div><span className="eyebrow">YOUR DAILY RHYTHM</span><h2 id={`${id}-heading`}><ChartNoAxesCombined size={19} aria-hidden="true" />学习趋势</h2></div><div className="study-range-toggle" aria-label="统计范围">{(['week','month'] as const).map(value=><button key={value} type="button" aria-pressed={range===value} onClick={()=>onRange(value)}>{value==='week'?'本周':'本月'}</button>)}</div></header>
    <p className="study-chart-summary">{range==='week'?'本周':'本月'}累计 <strong>{formatDuration(stats.rangeMinutes)}</strong><span>本周完成 {stats.weekPomodoros} 个番茄</span></p>
    <svg className="study-chart" viewBox="0 0 760 230" role="img" aria-label={`${range==='week'?'本周':'本月'}每日学习趋势；总计${formatDuration(stats.rangeMinutes)}，可在下方查看每天的数据`}>
      {[0,.5,1].map(level=><g key={level}><line x1="45" y1={height*(1-level)+12} x2="745" y2={height*(1-level)+12} className="study-chart-grid" /><text x="38" y={height*(1-level)+16} textAnchor="end" className="study-chart-axis">{Math.round(max*level)}</text></g>)}
      {stats.trend.map((day,index)=>{const barHeight=day.minutes/max*height,x=45+index*gap+gap*.2,week=['日','一','二','三','四','五','六'][parseLocalDate(day.date)!.getDay()];return <g key={day.date}><title>{day.date}：{formatDuration(day.minutes)}</title><rect x={x} y={192-Math.max(2,barHeight)} width={gap*.6} height={Math.max(2,barHeight)} rx={Math.min(7,gap*.2)} className={day.date===selectedDay?.date?'study-bar selected':'study-bar'} opacity={day.minutes?1:.25} />{(range==='week'||index%5===0||index===stats.trend.length-1)&&<text x={45+index*gap+gap/2} y="216" textAnchor="middle" className="study-chart-axis">{range==='week'?`周${week}`:Number(day.date.slice(-2))}</text>}</g>})}
    </svg>
    <div className="study-day-inspector"><label htmlFor={`${id}-day`}>查看某天学习<select id={`${id}-day`} value={selectedDay?.date??''} onChange={event=>setSelected(event.target.value)}>{stats.trend.map(day=><option key={day.date} value={day.date}>{day.date}</option>)}</select></label><output aria-live="polite">{selectedDay?.date} · {formatDuration(selectedDay?.minutes??0)}</output></div>
    {!stats.rangeMinutes&&<p className="field-hint">这个时间段还没有学习记录，零数据日期也会保留在图表里。</p>}
    <details className="study-daily-data"><summary>查看每日数据</summary><ul>{stats.trend.map(day=><li key={day.date}><time dateTime={day.date}>{day.date}</time><span>{formatDuration(day.minutes)}</span></li>)}</ul></details>
  </section>
}
