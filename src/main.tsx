import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import BookmarkProvider from './features/bookmarks/BookmarkProvider'
import CourseProvider from './features/courses/CourseProvider'
import ErrorBoundary from './components/ErrorBoundary'
import { initializePwa } from './features/pwa/pwaRuntime'
import { recoverStorageTransaction } from './features/backup/storageTransaction'
import { withHubLock } from './features/courses/hubLock'
import './styles/tokens.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/dashboard.css'
import './styles/bookmarks.css'
import './styles/courses.css'
import './styles/refinements.css'
import './styles/semester.css'
import './styles/tasks.css'
import './styles/exams.css'
import './styles/exam-integrations.css'
import './styles/study.css'
import './styles/settings.css'
import './styles/reminders.css'

const root = createRoot(document.getElementById('root')!)
initializePwa()
async function startApp() {
  let error: string | null
  try { error = await withHubLock(() => recoverStorageTransaction(window.localStorage)) }
  catch { error = '无法读取浏览器存储。请允许本地存储后重新加载；已有数据不会被覆盖。' }
  if (error) {
    root.render(<div className="app-error"><h1>需要先恢复本地数据</h1><p role="alert">{error}</p><button className="primary-button" onClick={() => window.location.reload()}>重新加载</button></div>)
    return
  }
  root.render(
  <StrictMode>
    <ErrorBoundary><BrowserRouter><BookmarkProvider><CourseProvider><App /></CourseProvider></BookmarkProvider></BrowserRouter></ErrorBoundary>
  </StrictMode>,
  )
}
void startApp()
