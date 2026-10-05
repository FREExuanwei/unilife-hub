import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../../../components/Modal'
import { useTasks } from '../useTasks'
import TaskForm from './TaskForm'
import TaskDetails from './TaskDetails'
export type TaskDialog={mode:'add'}|{mode:'edit'|'details'|'delete';id:string}
interface Props { dialog:TaskDialog|null; semesterId:string|null; now:Date; onDialog:(dialog:TaskDialog|null)=>void; onFeedback:(message:string)=>void }
export default function TaskModal({dialog,semesterId,now,onDialog,onFeedback}:Props) {
  const {tasks,saveTask,deleteTask,toggleTask}=useTasks()
  const [error,setError]=useState<string|null>(null)
  if(!dialog)return null
  const task=dialog.mode === 'add'?undefined:tasks.find(item=>item.id === dialog.id)
  const close=()=>{onDialog(null);setError(null)}
  const switchTo=(mode:'edit'|'delete')=>{setError(null);if(task)onDialog({mode,id:task.id})}
  if(dialog.mode !== 'add' && !task)return <Modal title="任务已变更" compact onClose={close}><p className="field-hint">任务已在其他页面被删除，请关闭后重试。</p></Modal>
  if(dialog.mode === 'add' || dialog.mode === 'edit')return <Modal key={`${dialog.mode}-${task?.id??'new'}`} title={task?'编辑任务':'添加任务'} subtitle="把想做的事，变成一步步的行动。" onClose={close}><TaskForm task={task} semesterId={semesterId} onCancel={close} onSave={async draft=>{const result=await saveTask(draft,task?.id);if(!result){onFeedback(task?'任务已更新':'任务已添加');close()};return result}} /></Modal>
  if(dialog.mode === 'details' && task)return <Modal key={`details-${task.id}`} title="任务详情" onClose={close}><TaskDetails task={task} now={now} onEdit={()=>switchTo('edit')} onDelete={()=>switchTo('delete')} onToggle={async ()=>{const result=await toggleTask(task.id);setError(result);if(!result)onFeedback(task.status === 'completed'?'任务已恢复':'任务已完成')}} />{error && <p className="form-save-error" role="alert">{error}</p>}</Modal>
  if(dialog.mode === 'delete' && task)return <Modal key={`delete-${task.id}`} title="删除任务" compact onClose={close}><div className="delete-confirmation"><span className="delete-confirmation-icon"><Trash2 size={26} aria-hidden="true" /></span><h3>确定删除《{task.title}》吗？</h3><p>删除后无法恢复，请确认这项任务已不再需要。</p>{error && <p className="field-error" role="alert">{error}</p>}<footer className="form-actions"><button type="button" className="secondary-button" autoFocus onClick={close}>取消</button><button type="button" className="danger-button" onClick={async ()=>{const result=await deleteTask(task.id);setError(result);if(!result){onFeedback('任务已删除');close()}}}>确认删除</button></footer></div></Modal>
  return null
}
