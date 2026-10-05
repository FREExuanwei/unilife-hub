import { useRef, useState } from 'react'
import { Download, Upload, ShieldCheck, Trash2, HardDrive, AlertTriangle } from 'lucide-react'
import Modal from '../../components/Modal'
import { withHubLock } from '../courses/hubLock'
import { useCourses } from '../courses/useCourses'
import { applyStorageTransaction, hasPendingRecovery } from './storageTransaction'
import { backupCounts, backupFilename, backupStorageValues, createBackup, MAX_BACKUP_BYTES, parseBackup, resetStorageValues } from './backupUtils'
import type { AppBackup } from './backupTypes'

export default function DataManagement() {
  const fileInput = useRef<HTMLInputElement>(null)
  const { data } = useCourses()
  const [backup, setBackup] = useState<AppBackup | null>(null)
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const safeRestore = Boolean(navigator.locks)
  const close = () => { if (!busy) { setBackup(null); setClearStep(0); setConfirmation('') } }
  function report(reason: unknown) { setError(reason instanceof Error ? reason.message : '数据操作失败，请检查浏览器存储后重试。') }
  async function exportData() {
    setBusy(true); setError(''); setFeedback('正在准备备份…')
    try {
      const snapshot = await withHubLock(() => createBackup(window.localStorage))
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = backupFilename(); document.body.append(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30000)
      setFeedback('备份已生成，请确认文件已保存到下载或“文件”中。')
    } catch (reason) { setFeedback(''); report(reason) }
    finally { setBusy(false) }
  }
  async function readFile(file?: File) {
    if (!file) return
    setBusy(true); setFeedback('正在校验备份…'); setError('')
    try {
      if (file.size > MAX_BACKUP_BYTES) throw Error('备份文件过大，请选择小于 10 MB 的 JSON 文件。')
      if (!file.name.toLowerCase().endsWith('.json')) throw Error('请选择 .json 格式的 UniLife Hub 备份。')
      setBackup(parseBackup(await file.text())); setFeedback('')
    } catch (reason) { setFeedback(''); report(reason) }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = '' }
  }
  async function restore(reset = false) {
    if (!safeRestore || (!reset && !backup) || (reset && confirmation !== '清空')) return
    setBusy(true); setError('')
    try {
      const values = reset ? resetStorageValues() : backupStorageValues(backup!.data)
      const reason = await withHubLock(() => applyStorageTransaction(values, window.localStorage))
      if (reason) {
        window.dispatchEvent(new Event('unilife:data-restored'))
        if (hasPendingRecovery(window.localStorage)) window.location.reload()
        throw Error(reason)
      }
      window.dispatchEvent(new Event('unilife:data-restored'))
      setBackup(null); setClearStep(0); setConfirmation('')
      setFeedback(reset ? '全部本地数据已清空，可以重新开始。' : '数据恢复成功。')
    } catch (reason) { report(reason) }
    finally { setBusy(false) }
  }
  return <section className="settings-section data-management" aria-labelledby="data-title">
    <div className="settings-section-title"><span className="settings-section-icon tone-cyan"><HardDrive aria-hidden="true" size={23} /></span><div><h2 id="data-title">数据管理</h2><p>把你的大学生活，安心带到下一台设备。</p></div></div>
    <p className="settings-description">UniLife Hub 的数据默认保存在当前浏览器设备中。手机与电脑的数据相互独立，建议定期导出备份。</p>
    <div className="data-actions"><button className="primary-button" disabled={busy} onClick={() => void exportData()}><Download size={18} aria-hidden="true" />{busy ? '处理中…' : '导出全部数据'}</button><button className="secondary-button" disabled={busy || !safeRestore} onClick={() => { setError(''); fileInput.current?.click() }}><Upload size={18} aria-hidden="true" />导入备份</button></div>
    <input type="file" accept=".json,application/json" aria-label="选择备份文件" ref={fileInput} className="sr-only" disabled={busy} onChange={event => void readFile(event.target.files?.[0])} />
    <p className="field-hint"><ShieldCheck size={15} aria-hidden="true" />备份包含全部业务数据、主题和提醒设置；计时中的专注、权限和缓存不会迁移。</p>
    {!safeRestore && <p className="storage-notice">当前浏览器不支持安全的跨页面恢复，请使用最新浏览器。仍可导出备份。</p>}
    <p className="bookmark-feedback" role="status">{feedback}</p>{error && <p className="storage-notice" role="alert">{error}</p>}
    <div className="danger-zone"><div><h3>清空全部数据</h3><p>删除当前浏览器中的全部业务数据和设置。请先导出备份。</p></div><button className="danger-button" disabled={busy || !safeRestore} onClick={() => { setError(''); setClearStep(1) }}><Trash2 size={17} aria-hidden="true" />清空全部数据</button></div>
    {backup && <Modal title="恢复备份" subtitle="先检查备份内容，再确认覆盖。" onClose={close}>
      <div className="backup-preview"><p>备份时间：<time dateTime={backup.exportedAt}>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(backup.exportedAt))}</time></p><dl className="backup-counts">{Object.entries(backupCounts(backup.data)).map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{count}</dd></div>)}</dl><p className="backup-warning"><AlertTriangle size={18} aria-hidden="true" />恢复会覆盖当前数据和设置。正在进行的计时将停止，请先导出当前备份。</p>{data.pomodoro.state.status !== 'idle' && <p className="storage-notice">当前有进行中的计时，恢复后不会继续此周期。</p>}</div>
      {error && <p className="storage-notice" role="alert">{error}</p>}<div className="form-actions"><button className="secondary-button" onClick={close} disabled={busy}>取消</button><button className="primary-button" onClick={() => void restore()} disabled={busy}>{busy ? '正在恢复…' : '确认覆盖恢复'}</button></div>
    </Modal>}
    {clearStep > 0 && <Modal compact title={clearStep === 1 ? '确定清空全部本地数据？' : '此操作无法撤销'} onClose={close}>
      <div className="delete-confirmation"><span className="delete-confirmation-icon"><Trash2 size={27} aria-hidden="true" /></span><p>学期、课程、任务、考试、收藏、学习记录及设置都会被清空，正在运行的计时也会停止。请先导出备份。</p>{clearStep === 2 && <div className="form-field"><label htmlFor="reset-confirm">输入“清空”以确认</label><input id="reset-confirm" autoFocus autoComplete="off" value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} /></div>}{error && <p className="storage-notice" role="alert">{error}</p>}<div className="form-actions"><button className="secondary-button" onClick={close} disabled={busy}>取消</button>{clearStep === 1 ? <button className="danger-button" onClick={() => setClearStep(2)}>下一步确认</button> : <button className="danger-button" disabled={busy || confirmation !== '清空'} onClick={() => void restore(true)}>{busy ? '正在清空…' : '永久清空数据'}</button>}</div></div>
    </Modal>}
  </section>
}
