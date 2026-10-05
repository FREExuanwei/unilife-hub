import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../../../components/Modal'
import { useExams } from '../useExams'
import ExamDetails from './ExamDetails'
import ExamForm from './ExamForm'

export type ExamDialog = { mode: 'add' } | { mode: 'details' | 'edit' | 'delete'; id: string }
interface Props { dialog: ExamDialog | null; semesterId: string | null; now: Date; onDialog: (dialog: ExamDialog | null) => void; onFeedback: (message: string) => void }

export default function ExamModal({ dialog, semesterId, now, onDialog, onFeedback }: Props) {
  const { exams, saveExam, deleteExam } = useExams()
  const [error, setError] = useState<string | null>(null)
  if (!dialog) return null
  const exam = dialog.mode === 'add' ? undefined : exams.find(item => item.id === dialog.id)
  const close = () => { onDialog(null); setError(null) }
  const switchTo = (mode: 'edit' | 'delete') => { setError(null); if (exam) onDialog({ mode, id: exam.id }) }
  if (dialog.mode !== 'add' && !exam) return <Modal title="考试已变更" compact onClose={close}><p className="field-hint">这场考试已被删除或无法找到，请关闭弹窗后重试。</p><footer className="form-actions"><button type="button" className="secondary-button" autoFocus onClick={close}>关闭</button></footer></Modal>
  if (dialog.mode === 'add' || dialog.mode === 'edit') return <Modal key={`${dialog.mode}-${exam?.id ?? 'new'}`} title={exam ? '编辑考试' : '添加考试'} subtitle="日期、地点和准备事项，都放在这里。" onClose={close}><ExamForm exam={exam} semesterId={semesterId} onCancel={close} onSave={async (draft, confirmOutside) => { const result = await saveExam(draft, exam?.id, confirmOutside); if (!result) { onFeedback(exam ? '考试已更新' : '考试已添加'); close() }; return result }} /></Modal>
  if (dialog.mode === 'details' && exam) return <Modal key={`details-${exam.id}`} title="考试详情" onClose={close}><ExamDetails exam={exam} now={now} onEdit={() => switchTo('edit')} onDelete={() => switchTo('delete')} /></Modal>
  if (dialog.mode === 'delete' && exam) return <Modal key={`delete-${exam.id}`} title="删除考试" compact onClose={close}><div className="delete-confirmation"><span className="delete-confirmation-icon"><Trash2 size={26} aria-hidden="true" /></span><h3>确定删除《{exam.title}》吗？</h3><p>删除后无法恢复。这场考试的日期、地点与备注都会一同删除。</p>{error && <p className="field-error" role="alert">{error}</p>}<footer className="form-actions"><button type="button" className="secondary-button" autoFocus onClick={close}>取消</button><button type="button" className="danger-button" onClick={async () => { const result = await deleteExam(exam.id); setError(result); if (!result) { onFeedback('考试已删除'); close() } }}>确认删除</button></footer></div></Modal>
  return null
}
