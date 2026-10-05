import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { RefreshCw, ShieldAlert } from 'lucide-react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('UniLife Hub component error', error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return <div className="app-error"><span className="settings-section-icon"><ShieldAlert aria-hidden="true" /></span><h1>UniLife Hub 遇到了一点问题。</h1><p>请重新加载页面。此操作不会主动删除你的本地数据。</p><button className="primary-button" onClick={() => window.location.reload()}><RefreshCw size={18} aria-hidden="true" />重新加载</button></div>
  }
}
