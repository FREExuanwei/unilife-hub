import { useState } from 'react'
import Modal from '../../../components/Modal'
import { useStudy } from '../useStudy'
import StudyRecordForm from './StudyRecordForm'
import StudyRecordDetails from './StudyRecordDetails'
export type StudyDialog={mode:'add'}|{mode:'details'|'edit'|'delete';id:string}
export default function StudyRecordModal({dialog,onDialog,onFeedback}:{dialog:StudyDialog|null;onDialog:(dialog:StudyDialog|null)=>void;onFeedback:(text:string)=>void}){
  const {records,saveStudy,deleteStudy}=useStudy(),[error,setError]=useState<string|null>(null)
  if(!dialog)return null
  const record=dialog.mode==='add'?undefined:records.find(r=>r.id===dialog.id),close=()=>{onDialog(null);setError(null)}
  if(dialog.mode!=='add'&&!record)return <Modal title="记录已变更" compact onClose={close}><p>这条记录已被删除，请关闭后重试。</p><footer className="form-actions"><button className="primary-button" type="button" onClick={close}>关闭</button></footer></Modal>
  if(dialog.mode==='add'||dialog.mode==='edit')return <Modal key={`${dialog.mode}-${record?.id??'new'}`} title={record?'编辑学习记录':'添加学习记录'} subtitle="每一份专注，都值得被记录。" onClose={close}><StudyRecordForm record={record} onCancel={close} onSave={async draft=>{const result=await saveStudy(draft,record?.id);if(!result){onFeedback(record?'学习记录已更新':'学习记录已添加');close()}return result}} /></Modal>
  if(dialog.mode==='details'&&record)return <Modal key={`details-${record.id}`} title="学习记录详情" onClose={close}><StudyRecordDetails record={record} onEdit={()=>onDialog({mode:'edit',id:record.id})} onDelete={()=>{setError(null);onDialog({mode:'delete',id:record.id})}} /></Modal>
  if(dialog.mode==='delete'&&record)return <Modal key={`delete-${record.id}`} title="删除学习记录" compact onClose={close}><div className="delete-confirmation"><h3>确定删除这条学习记录吗？</h3><p>「{record.title}」· {record.date} · {record.durationMinutes} 分钟</p><p>删除后所有学习统计会立即更新，此操作无法撤销。</p>{error&&<p className="field-error" role="alert">{error}</p>}<footer className="form-actions"><button className="secondary-button" type="button" autoFocus onClick={close}>取消</button><button className="danger-button" type="button" onClick={async ()=>{const result=await deleteStudy(record.id);setError(result);if(!result){onFeedback('学习记录已删除');close()}}}>确认删除</button></footer></div></Modal>
  return null
}
