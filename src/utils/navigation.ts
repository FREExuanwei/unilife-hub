import { House, CalendarDays, ListTodo, Timer, Bookmark, ChartNoAxesCombined, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavigationItem {
  path: string
  label: string
  mobileLabel?: string
  icon: LucideIcon
  tone: string
}

export const navigationItems: NavigationItem[] = [
  { path: '/', label: '首页', mobileLabel: '首页', icon: House, tone: 'purple' },
  { path: '/schedule', label: '课程表', mobileLabel: '课程', icon: CalendarDays, tone: 'blue' },
  { path: '/tasks', label: '作业与待办', mobileLabel: '待办', icon: ListTodo, tone: 'orange' },
  { path: '/exams', label: '考试倒计时', icon: Timer, tone: 'purple' },
  { path: '/bookmarks', label: '网站收藏', mobileLabel: '收藏', icon: Bookmark, tone: 'pink' },
  { path: '/statistics', label: '学习统计', icon: ChartNoAxesCombined, tone: 'cyan' },
  { path: '/settings', label: '设置', icon: Settings, tone: 'neutral' },
]

export const mobileItems = navigationItems.filter((item) => item.mobileLabel)
export const moreItems = navigationItems.filter((item) => !item.mobileLabel)
