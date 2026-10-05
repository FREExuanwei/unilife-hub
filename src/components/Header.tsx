import { ChevronRight, LayoutDashboard } from 'lucide-react'
import { useLocation } from 'react-router'
import Brand from './Brand'
import ThemeToggle from './ThemeToggle'
import { navigationItems } from '../utils/navigation'
import type { Theme } from '../utils/theme'

interface HeaderProps { theme: Theme; onToggleTheme: () => void }

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const { pathname } = useLocation()
  const pageName = navigationItems.find((item) => item.path === pathname)?.label ?? '页面未找到'
  return (
    <header className="header">
      <div className="breadcrumb"><LayoutDashboard size={18} aria-hidden="true" /><span>我的空间</span><ChevronRight size={14} aria-hidden="true" /><strong>{pageName}</strong></div>
      <div className="mobile-brand"><Brand /></div>
      <div className="header-actions"><span className="personal-badge"><span className="status-dot" />个人工作台</span><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div>
    </header>
  )
}
