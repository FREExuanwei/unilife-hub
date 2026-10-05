import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import MobileNavigation from '../components/MobileNavigation'
import { useTheme } from '../hooks/useTheme'
import { navigationItems } from '../utils/navigation'
import PwaStatus from '../features/pwa/PwaStatus'
import ReminderFeedback from '../features/reminders/ReminderFeedback'

export default function Layout() {
  const { theme, toggleTheme, storageError } = useTheme()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    const title = navigationItems.find((item) => item.path === pathname)?.label ?? '页面未找到'
    document.title = `${title} · UniLife Hub`
    if (previousPath.current !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      mainRef.current?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">跳转到主要内容</a>
      <Sidebar />
      <div className="main-shell">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main id="main-content" className="main-content" ref={mainRef} tabIndex={-1}>
          {storageError && <p className="storage-notice" role="alert">{storageError}</p>}<PwaStatus /><ReminderFeedback /><Suspense fallback={<p className="page-loading" role="status">正在打开页面…</p>}><Outlet /></Suspense>
        </main>
        <footer className="footer"><span>为你的大学生活，留一点从容。</span><span>UniLife Hub <span className="footer-dot">·</span> 个人大学生活助手</span></footer>
      </div>
      <MobileNavigation />
    </div>
  )
}
