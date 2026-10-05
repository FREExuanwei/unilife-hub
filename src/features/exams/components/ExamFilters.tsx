import { useId } from 'react'
import { Search } from 'lucide-react'
import type { ExamFilters as Filters } from '../examTypes'
import { EXAM_TYPES } from '../examUtils'

const statuses: { value: Filters['status']; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'upcoming', label: '即将考试' },
  { value: 'today', label: '今天' }, { value: 'week', label: '7 天内' }, { value: 'ended', label: '已结束' },
]

export default function ExamFilters({ filters, onChange }: { filters: Filters; onChange: (filters: Filters) => void }) {
  const id = useId()
  return <section className="exam-filters" aria-label="筛选考试">
    <div className="exam-search-row"><label className="exam-search" htmlFor={id}><Search size={19} aria-hidden="true" /><span className="sr-only">搜索考试</span><input id={id} type="search" placeholder="搜索考试、课程、地点或备注" value={filters.search} onChange={event => onChange({ ...filters, search: event.target.value })} /></label>
      <label className="exam-type-filter">考试类型<select aria-label="考试类型筛选" value={filters.type} onChange={event => onChange({ ...filters, type: event.target.value as Filters['type'] })}><option value="all">全部类型</option>{EXAM_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
    <div className="exam-status-filters" role="group" aria-label="考试状态筛选">{statuses.map(item => <button key={item.value} type="button" aria-pressed={filters.status === item.value} className={filters.status === item.value ? 'selected' : ''} onClick={() => onChange({ ...filters, status: item.value })}>{item.label}</button>)}</div>
  </section>
}
