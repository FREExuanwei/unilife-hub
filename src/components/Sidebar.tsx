import { NavLink } from 'react-router'
import { Sprout, ArrowUpRight } from 'lucide-react'
import Brand from './Brand'
import { navigationItems } from '../utils/navigation'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <p className="nav-caption">我的空间</p>
      <nav aria-label="主导航" className="sidebar-nav">
        {navigationItems.map(({ path, label, icon: Icon, tone }) => (
          <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `sidebar-link tone-${tone}${isActive ? ' active' : ''}`}>
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
            <span className="active-indicator" aria-hidden="true" />
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><Sprout size={26} strokeWidth={1.5} aria-hidden="true" /><strong>慢慢来，也很快。</strong><p>在这里，找到学习与生活<br />刚刚好的节奏。</p></div>
        <div className="workspace-caption"><span className="status-dot" />个人生活空间<ArrowUpRight size={14} aria-hidden="true" /></div>
      </div>
    </aside>
  )
}
