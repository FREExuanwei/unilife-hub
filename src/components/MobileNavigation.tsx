import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Ellipsis, ChevronRight, X } from 'lucide-react'
import { mobileItems, moreItems } from '../utils/navigation'

export default function MobileNavigation() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { pathname } = useLocation()
  const moreActive = moreItems.some((item) => item.path === pathname)

  useEffect(() => { dialogRef.current?.close() }, [pathname])

  return (
    <>
      <nav className="mobile-navigation" aria-label="手机导航">
        {mobileItems.map(({ path, mobileLabel, icon: Icon, tone }) => (
          <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `mobile-link tone-${tone}${isActive ? ' active' : ''}`}><Icon size={21} strokeWidth={1.8} aria-hidden="true" /><span>{mobileLabel}</span></NavLink>
        ))}
        <button type="button" className={`mobile-link${moreActive ? ' active' : ''}`} onClick={() => dialogRef.current?.showModal()} aria-label="打开更多导航" aria-haspopup="dialog"><Ellipsis size={22} aria-hidden="true" /><span>更多</span></button>
      </nav>
      <dialog ref={dialogRef} className="more-dialog" aria-labelledby="more-title" onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close() }}>
        <div className="more-dialog-content">
          <div className="more-heading"><h2 id="more-title">更多功能</h2><button type="button" className="icon-button" aria-label="关闭更多导航" onClick={() => dialogRef.current?.close()}><X size={21} aria-hidden="true" /></button></div>
          {moreItems.map(({ path, label, icon: Icon }) => <Link key={path} to={path} className={`more-link${pathname === path ? ' active' : ''}`} onClick={() => dialogRef.current?.close()}><Icon size={21} aria-hidden="true" /><span>{label}</span><ChevronRight size={17} aria-hidden="true" /></Link>)}
        </div>
      </dialog>
    </>
  )
}
