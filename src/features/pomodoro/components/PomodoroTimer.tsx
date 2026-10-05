import { useId, useState } from 'react'
import { Settings2, Timer, X } from 'lucide-react'
import Modal from '../../../components/Modal'
import { useCourses } from '../../courses/useCourses'
import { selectDefaultSemester } from '../../semester/semesterUtils'
import { usePomodoro } from '../usePomodoro'
import type { PomodoroAction } from '../pomodoroTypes'
import { formatDuration } from '../../study/studyUtils'
import PomodoroControls from './PomodoroControls'
import PomodoroSettings from './PomodoroSettings'
import { getReminderRuntime } from '../../reminders/reminderRuntime'
import { readReminderSettings } from '../../reminders/reminderStorage'
export default function PomodoroTimer(){
  const id=useId(),{data}=useCourses(),{pomodoro,timerAction,remainingMs,elapsedMs,now}=usePomodoro()
  const [title,setTitle]=useState(''),[courseId,setCourseId]=useState(''),[settingsOpen,setSettingsOpen]=useState(false),[ending,setEnding]=useState<{cycleId:string;reset:boolean}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)
  const state=pomodoro.state,active=state.status!=='idle',automatic=selectDefaultSemester(data.semesters,new Date(now))
  const courses=automatic.isWithin?data.courses.filter(c=>c.semesterId===automatic.semester?.id):[]
  const seconds=Math.ceil(remainingMs/1000),display=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`
  const progress=Math.max(0,Math.min(1,1-remainingMs/state.plannedMs)),circumference=2*Math.PI*88
  async function act(action:PomodoroAction){setBusy(true);const result=await timerAction(action);setBusy(false);setError(result);return result}
  async function start(){
    unlockSound()
    const course=data.courses.find(c=>c.id===courseId)
    if(courseId&&!course){setError('原课程已删除，请重新选择。');return}
    await act({type:'start',cycleId:crypto.randomUUID(),title,courseId:course?.id??null,semesterId:course?.semesterId??(automatic.isWithin?automatic.semester?.id??null:null),courseNameSnapshot:course?.name??''})
  }
  function unlockSound(){const loaded=readReminderSettings();if(!loaded.error&&loaded.settings.sound)void getReminderRuntime().unlockAudio()}
  async function finish(save:boolean){if(!ending)return;const result=await act({type:'finish',cycleId:ending.cycleId,save});if(!result)setEnding(null)}
  const minutes=Math.floor(elapsedMs/60000)
  return <section id="focus-timer" className={`study-panel pomodoro-panel ${state.mode==='break'?'is-break':''}`} aria-labelledby={`${id}-heading`}><header className="study-panel-heading"><div><span className="eyebrow">ONE THING AT A TIME</span><h2 id={`${id}-heading`}><Timer size={19} aria-hidden="true" />专注计时</h2></div><button className="icon-button" type="button" aria-label="专注计时设置" disabled={active||busy} onClick={()=>setSettingsOpen(true)}><Settings2 size={20} aria-hidden="true" /></button></header>
    <div className="study-range-toggle pomodoro-modes" aria-label="计时模式">{(['focus','break'] as const).map(mode=><button key={mode} type="button" aria-pressed={state.mode===mode} disabled={active||busy} onClick={()=>void act({type:'mode',mode})}>{mode==='focus'?'专注':'短休息'}</button>)}</div>
    <div className="pomodoro-clock"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" className="pomodoro-ring-track" /><circle cx="100" cy="100" r="88" className="pomodoro-ring" strokeDasharray={circumference} strokeDashoffset={circumference*(1-progress)} transform="rotate(-90 100 100)" /></svg><div><span>{state.status==='paused'?'已暂停':state.mode==='focus'?'留一段时间给专注':'放松一下，慢慢来'}</span><output className="pomodoro-time" aria-label={`剩余 ${Math.floor(seconds/60)} 分钟 ${seconds%60} 秒`}>{display}</output><small>{active?`已${state.mode==='focus'?'专注':'休息'} ${formatDuration(minutes)}`:`${state.mode==='focus'?pomodoro.settings.focusMinutes:pomodoro.settings.breakMinutes} 分钟 · ${state.mode==='focus'?'专注':'休息'}`}</small></div></div>
    {state.mode==='focus'&&<div className="pomodoro-inputs"><div className="form-field"><label htmlFor={`${id}-title`}>学习内容</label><input id={`${id}-title`} disabled={active} maxLength={120} value={active?state.title:title} placeholder="这段时间，你想学些什么？" onChange={e=>setTitle(e.target.value)} /></div><div className="form-field"><label htmlFor={`${id}-course`}>专注关联课程</label><select id={`${id}-course`} disabled={active} value={active?state.courseId??'':courseId} onChange={e=>setCourseId(e.target.value)}><option value="">不关联课程</option>{courses.map(course=><option key={course.id} value={course.id}>{course.name}</option>)}{active&&state.courseId&&!courses.some(c=>c.id===state.courseId)&&<option value={state.courseId}>{state.courseNameSnapshot}</option>}</select></div>{active&&!state.courseId&&state.courseNameSnapshot&&<p className="field-hint">{state.courseNameSnapshot}（原课程已删除，专注会继续保存）</p>}</div>}
    <PomodoroControls state={state} busy={busy||!navigator.locks} onStart={()=>void start()} onPause={()=>void act({type:'pause',cycleId:state.cycleId!})} onResume={()=>{unlockSound();void act({type:'resume',cycleId:state.cycleId!})}} onFinish={reset=>{setError(null);setEnding({cycleId:state.cycleId!,reset})}} />
    <p className="pomodoro-hint">{state.mode==='focus'?'完整专注自动保存 · 暂停时间不计入 · 刷新后可恢复':'休息不计入学习时间 · 结束后由你开始下一次专注'}</p>
    {!navigator.locks&&<p className="storage-notice" role="alert">此浏览器不支持安全恢复计时，请换用最新的现代浏览器。你仍可以手动记录学习。</p>}
    {pomodoro.notice&&<div className="pomodoro-notice" role="status"><p>{pomodoro.notice}</p><button type="button" className="icon-button" aria-label="关闭计时提示" onClick={()=>void act({type:'dismiss'})}><X size={17} aria-hidden="true" /></button></div>}
    {error&&!ending&&<p className="form-save-error" role="alert">{error}</p>}
    {settingsOpen&&<PomodoroSettings settings={pomodoro.settings} onSave={settings=>act({type:'settings',settings})} onClose={()=>setSettingsOpen(false)} />}
    {ending&&<Modal title={ending.reset?'重置计时':'结束计时'} compact onClose={()=>{setEnding(null);setError(null)}}><div className="delete-confirmation"><h3>{state.mode==='focus'?'是否保存本次已完成的专注时间？':'结束本次休息吗？'}</h3><p>{state.mode==='focus'?`已学习 ${formatDuration(minutes)}，暂停不会计入。`:'休息时间不会生成学习记录。'}</p>{state.mode==='focus'&&minutes<1&&<p className="field-hint">不足 1 分钟，不生成记录。</p>}{error&&<p className="form-save-error" role="alert">{error}</p>}<footer className="form-actions pomodoro-end-actions"><button className="secondary-button" type="button" disabled={busy} autoFocus onClick={()=>{setEnding(null);setError(null)}}>取消</button><button className="secondary-button" type="button" disabled={busy} onClick={()=>void finish(false)}>{state.mode==='focus'?'放弃并重置':'确认结束'}</button>{state.mode==='focus'&&minutes>=1&&<button className="primary-button" type="button" disabled={busy} onClick={()=>void finish(true)}>保存并结束</button>}</footer></div></Modal>}
  </section>
}
