import { useMemo } from 'react'
import { Link } from 'react-router'
import { ChartNoAxesCombined } from 'lucide-react'
import DashboardCard from '../../components/DashboardCard'
import { useStudy } from './useStudy'
import { aggregateStudy, formatDuration } from './studyUtils'
export default function DashboardStudy({now}:{now:Date}){
  const {records,courses,storageError}=useStudy(),stats=useMemo(()=>aggregateStudy(records,courses,new Date(),'week'),[records,courses,now])
  return <Link className="dashboard-study" to="/statistics" aria-label="查看学习统计"><DashboardCard title="本周学习" value={formatDuration(stats.week)} description={storageError?'学习数据暂时无法读取':stats.week?`本周已学习 ${stats.weekDays} 天 · 连续 ${stats.streak} 天`:'每一份专注，都值得记录'} icon={ChartNoAxesCombined} tone="cyan" /></Link>
}
