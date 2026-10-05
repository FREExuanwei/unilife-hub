import { Download, RefreshCw, Smartphone } from 'lucide-react'
import { usePwa } from './usePwa'
import './pwa.css'

export default function PwaSettings() {
  const { installed, installAvailable, offlineReady, updateAvailable, updating, checking, status, install, checkForUpdates, applyUpdate } = usePwa()
  const offlineLabel = status === 'development' ? '开发预览中，离线资源将在正式构建中启用。'
    : status === 'unsupported' ? '当前环境暂不支持离线安装，可继续在浏览器中使用。'
      : status === 'error' ? '离线资源未启用，可继续使用当前页面和本地数据。'
        : offlineReady ? '离线资源已准备好，可离线打开各个页面并编辑本地数据。' : '正在准备离线资源，首次使用需要连接网络。'
  return <section className="pwa-settings-card" aria-labelledby="pwa-settings-title">
    <div className="pwa-settings-heading"><span className="semester-card-icon"><Smartphone size={26} aria-hidden="true" /></span><div><p className="eyebrow">ALWAYS WITH YOU</p><h2 id="pwa-settings-title">安装与离线使用</h2></div></div>
    <p>{offlineLabel}</p>
    <p className="pwa-install-help">{installed ? '已在独立窗口中使用 UniLife Hub。' : installAvailable ? '安装后，可从桌面或主屏幕直接打开 UniLife Hub。' : '在支持的浏览器菜单中选择「安装应用」；iPhone / iPad 可在 Safari 的分享菜单中选择「添加到主屏幕」。安装入口由浏览器决定。'}</p>
    <div className="pwa-settings-actions">
      {installAvailable && !installed && <button type="button" className="primary-button" onClick={() => void install()}><Download size={17} aria-hidden="true" />安装应用</button>}
      {status === 'ready' && <button type="button" className="secondary-button" disabled={checking || updating} onClick={() => void (updateAvailable ? applyUpdate() : checkForUpdates())}><RefreshCw size={17} aria-hidden="true" />{updating ? '正在更新…' : checking ? '正在检查…' : updateAvailable ? '刷新更新' : '检查更新'}</button>}
    </div>
    <p className="field-hint">应用资源缓存与本地数据分别保存。更新会保留已保存的数据；清除浏览器网站数据会同时删除它们。外部书签页面与图标需要网络。</p>
  </section>
}
