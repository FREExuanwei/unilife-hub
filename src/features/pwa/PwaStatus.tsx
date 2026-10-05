import { RefreshCw, WifiOff } from 'lucide-react'
import { usePwa } from './usePwa'
import './pwa.css'

export default function PwaStatus() {
  const { online, offlineReady, updateAvailable, updating, error, applyUpdate } = usePwa()
  if (online && !updateAvailable && !error) return null
  return <div className="pwa-status-wrap">
    {!online && <div className="pwa-status" role="status"><WifiOff size={18} aria-hidden="true" /><p><strong>当前离线</strong><span>{offlineReady ? '本地数据仍可查看和编辑；外部网站需要网络。' : '已打开的页面可继续使用，联网后将准备离线资源。'}</span></p></div>}
    {updateAvailable && <div className="pwa-status pwa-update" role="status"><RefreshCw size={18} aria-hidden="true" /><p><strong>新版本已准备好</strong><span>请先保存正在编辑的内容，再刷新应用。本地已保存的数据会保留。</span></p><button type="button" className="secondary-button" disabled={updating} onClick={() => void applyUpdate()}>{updating ? '正在更新…' : '刷新更新'}</button></div>}
    {error && <p className="pwa-error" role="alert">{error}</p>}
  </div>
}
