import test from 'node:test'
import assert from 'node:assert/strict'
import { initialPomodoro, transitionPomodoro } from '../src/features/pomodoro/pomodoroUtils.ts'
import { readCourseStorage, writeCourseStorage, COURSE_STORAGE_KEY } from '../src/features/courses/courseStorage.ts'
import { withHubLock } from '../src/features/courses/hubLock.ts'
import * as storageApi from '../src/features/reminders/reminderStorage.ts'
import * as runtimeApi from '../src/features/reminders/reminderRuntime.ts'
import * as completionApi from '../src/features/reminders/reminderCompletion.ts'

const api=value=>{assert.ok(value,'The reminder implementation is required');return value}
const memory=(initial={})=>({values:new Map(Object.entries(initial)),getItem(key){return this.values.get(key)??null},setItem(key,value){this.values.set(key,value)}})
const settings={version:1,sound:true,vibration:true,notifications:false}
const start=(mode='focus')=>{
 let p=initialPomodoro()
 p=transitionPomodoro(p,{type:'settings',settings:{focusMinutes:1,breakMinutes:1}},0).pomodoro
 if(mode==='break')p=transitionPomodoro(p,{type:'mode',mode},0).pomodoro
 return transitionPomodoro(p,{type:'start',cycleId:`${mode}-cycle`,title:'复习',courseId:null,semesterId:null,courseNameSnapshot:''},1000).pomodoro
}

test('settings default safely and whitelist only validated versioned booleans',()=>{
 const {readReminderSettings,parseReminderSettings,REMINDER_STORAGE_KEY}=api(storageApi)
 assert.deepEqual(readReminderSettings(memory()),{settings,error:null})
 assert.deepEqual(parseReminderSettings({...settings,claims:['secret'],volume:999}),settings)
 for(const bad of [null,[],{...settings,version:2},{...settings,sound:'true'},{...settings,notifications:undefined}])assert.throws(()=>parseReminderSettings(bad))
 const store=memory({[REMINDER_STORAGE_KEY]:'broken'})
 assert.ok(readReminderSettings(store).error)
 assert.equal(store.getItem(REMINDER_STORAGE_KEY),'broken')
})

test('storage failures stay explicit and preserve existing reminder settings',()=>{
 const {writeReminderSettings,readReminderSettings,REMINDER_STORAGE_KEY}=api(storageApi)
 const raw=JSON.stringify(settings),store={getItem(){return raw},setItem(){throw Error('quota')}}
 assert.ok(writeReminderSettings({...settings,sound:false},store))
 assert.equal(store.getItem(REMINDER_STORAGE_KEY),raw)
 assert.ok(readReminderSettings({getItem(){throw Error('blocked')}}).error)
})

test('pending recovery blocks reminder preference writes while a committed journal permits them',async()=>{
 const {saveReminderSettings,REMINDER_STORAGE_KEY}=api(storageApi)
 const raw=JSON.stringify(settings),store=memory({[REMINDER_STORAGE_KEY]:raw,'unilife-recovery:v1':JSON.stringify({version:1,phase:'prepared'})})
 assert.ok(await saveReminderSettings({sound:false},store))
 assert.equal(store.getItem(REMINDER_STORAGE_KEY),raw)
 store.setItem('unilife-recovery:v1',JSON.stringify({version:1,phase:'committed'}))
 assert.equal(await saveReminderSettings({sound:false},store),null)
 assert.equal(JSON.parse(store.getItem(REMINDER_STORAGE_KEY)).sound,false)
})

test('settings writes use the shared hub lock and merge the latest restored preferences',async()=>{
 const {saveReminderSettings,REMINDER_STORAGE_KEY}=api(storageApi),store=memory(),names=[]
 const locks={request(name,work){names.push(name);store.setItem(REMINDER_STORAGE_KEY,JSON.stringify({...settings,vibration:false}));return Promise.resolve().then(work)}}
 assert.equal(await saveReminderSettings({sound:false},store,locks),null)
 assert.deepEqual(names,['unilife-hub:write'])
 assert.deepEqual(JSON.parse(store.getItem(REMINDER_STORAGE_KEY)),{...settings,sound:false,vibration:false})
})

test('a completed cycle saves before cues and durable claims prevent StrictMode, refresh and tab duplicates',()=>{
 const {commitTimerWithReminder}=api(completionApi),store=memory(),before=start(),action={type:'complete',cycleId:'focus-cycle'}
 const after=transitionPomodoro(before,action,62000).pomodoro,events=[]
 const runtime={play(mode,value,id){events.push(['cue',mode,value.notifications,id]);return {}}}
 const perform=()=>commitTimerWithReminder(before,after,action,62000,()=>{events.push(['save']);return null},{storage:store,runtime})
 assert.equal(perform().reminderError,null)
 assert.deepEqual(events,[['save'],['cue','focus',false,'focus-cycle']])
 perform();perform()
 assert.equal(events.filter(e=>e[0]==='cue').length,1)
 const claimStore=api(completionApi).REMINDER_CLAIMS_STORAGE_KEY
 assert.ok(store.getItem(claimStore).includes('focus-cycle'))
})

test('two concurrent completing tabs save one focus record and deliver one logical reminder',async()=>{
 const {commitTimerWithReminder}=api(completionApi),store=memory(),cues=[]
 writeCourseStorage({version:5,semesters:[],courses:[],tasks:[],exams:[],studyRecords:[],pomodoro:start()},store)
 let tail=Promise.resolve()
 const locks={request(_name,work){const result=tail.then(work);tail=result.catch(()=>{});return result}}
 const complete=()=>withHubLock(()=>{
  const loaded=readCourseStorage(store)
  assert.equal(loaded.error,null)
  const action={type:'complete',cycleId:'focus-cycle'},result=transitionPomodoro(loaded.data.pomodoro,action,62000)
  return commitTimerWithReminder(loaded.data.pomodoro,result.pomodoro,action,62000,()=>writeCourseStorage({...loaded.data,pomodoro:result.pomodoro,studyRecords:result.record?[...loaded.data.studyRecords,result.record]:loaded.data.studyRecords},store),{storage:store,runtime:{play(mode){cues.push(mode)}}})
 },locks)
 await Promise.all([complete(),complete()])
 assert.equal(JSON.parse(store.getItem(COURSE_STORAGE_KEY)).studyRecords.length,1)
 assert.deepEqual(cues,['focus'])
})

test('failed timer save or failed durable claim never emits an optional cue',()=>{
 const {commitTimerWithReminder}=api(completionApi),before=start(),action={type:'complete',cycleId:'focus-cycle'},after=transitionPomodoro(before,action,62000).pomodoro
 let cues=0
 const runtime={play(){cues++}}
 const fail=commitTimerWithReminder(before,after,action,62000,()=>'save failed',{storage:memory(),runtime})
 assert.equal(fail.storageError,'save failed');assert.equal(cues,0)
 const claim=commitTimerWithReminder(before,after,action,62000,()=>null,{storage:{getItem(){return null},setItem(){throw Error('quota')}},runtime})
 assert.ok(claim.reminderError);assert.equal(cues,0)
})

test('claim history stays bounded while retaining the current and recent completed cycles',()=>{
 const {commitTimerWithReminder,REMINDER_CLAIMS_STORAGE_KEY}=api(completionApi),cycles=Array.from({length:300},(_,i)=>`old-${i}`),store=memory({[REMINDER_CLAIMS_STORAGE_KEY]:JSON.stringify({version:1,cycles})})
 const before=start(),action={type:'complete',cycleId:'focus-cycle'},after=transitionPomodoro(before,action,62000).pomodoro
 let cues=0
 commitTimerWithReminder(before,after,action,62000,()=>null,{storage:store,runtime:{play(){cues++}}})
 const kept=JSON.parse(store.getItem(REMINDER_CLAIMS_STORAGE_KEY)).cycles
 assert.equal(kept.length,256);assert.equal(kept.at(-1),'focus-cycle');assert.equal(kept.at(-2),'old-299')
 commitTimerWithReminder(before,after,action,62000,()=>null,{storage:store,runtime:{play(){cues++}}})
 assert.equal(cues,1)
})

test('manual early save/reset never reminds; an expired restored break reminds once without a study record',()=>{
 const {commitTimerWithReminder}=api(completionApi),store=memory(),events=[],runtime={play(mode){events.push(mode)}}
 for(const save of [true,false]){
  const before=start(),action={type:'finish',cycleId:'focus-cycle',save},after=transitionPomodoro(before,action,31000).pomodoro
  commitTimerWithReminder(before,after,action,31000,()=>null,{storage:store,runtime})
 }
 assert.deepEqual(events,[])
 const before=start('break'),action={type:'complete',cycleId:'break-cycle'},result=transitionPomodoro(before,action,200000)
 assert.equal(result.record,undefined)
 commitTimerWithReminder(before,result.pomodoro,action,200000,()=>null,{storage:store,runtime})
 commitTimerWithReminder(before,result.pomodoro,action,200000,()=>null,{storage:store,runtime})
 assert.deepEqual(events,['break'])
})
test('an expired pause or finish transition delivers natural completion cues exactly once',()=>{
 const {commitTimerWithReminder}=api(completionApi)
 for(const action of [{type:'pause',cycleId:'focus-cycle'},{type:'finish',cycleId:'focus-cycle',save:false}]){
  const before=start(),result=transitionPomodoro(before,action,62000),events=[],store=memory()
  assert.equal(result.record.pomodoroCompleted,true)
  commitTimerWithReminder(before,result.pomodoro,action,62000,()=>null,{storage:store,runtime:{play(){events.push('cue')}}})
  assert.deepEqual(events,['cue'])
 }
})
test('an untouched winning tab leaves sound delivery available to an audio-ready tab exactly once',()=>{
 const {commitTimerWithReminder,deliverCompletionSound}=api(completionApi),store=memory(),before=start(),action={type:'complete',cycleId:'focus-cycle'},after=transitionPomodoro(before,action,62000).pomodoro
 const winner=[],starter=[],silent={audioReady:()=>false,play(_mode,settings){if(settings.sound)winner.push('sound')}},ready={audioReady:()=>true,play(_mode,settings){if(settings.sound)starter.push('sound')}}
 commitTimerWithReminder(before,after,action,62000,()=>null,{storage:store,runtime:silent})
 deliverCompletionSound(before,after,62000,{storage:store,runtime:ready})
 deliverCompletionSound(before,after,62000,{storage:store,runtime:ready})
 assert.deepEqual(winner,[]);assert.deepEqual(starter,['sound'])
})

test('notification permission is requested only on explicit enable and only once after default or denial',async()=>{
 const {requestReminderNotificationPermission}=api(runtimeApi),store=memory()
 let requests=0
 const notification={permission:'default',requestPermission:async()=>{requests++;return 'default'},create(){}}
 const browser={notification,secureContext:true}
 const first=await requestReminderNotificationPermission(browser,store)
 assert.equal(first.enabled,false);assert.equal(requests,1)
 assert.equal((await requestReminderNotificationPermission(browser,store)).enabled,false);assert.equal(requests,1)
 notification.permission='denied'
 await requestReminderNotificationPermission(browser,memory());assert.equal(requests,1)
 notification.permission='granted'
 assert.equal((await requestReminderNotificationPermission(browser,store)).enabled,true);assert.equal(requests,1)
})

test('blocked permission marker and unsupported notifications gracefully fall back without prompting',async()=>{
 const {requestReminderNotificationPermission}=api(runtimeApi)
 let requests=0
 const notification={permission:'default',requestPermission:async()=>{requests++;return 'granted'},create(){}}
 const failed=await requestReminderNotificationPermission({notification,secureContext:true},{getItem(){throw Error('blocked')}})
 assert.equal(failed.enabled,false);assert.ok(failed.error);assert.equal(requests,0)
 assert.equal((await requestReminderNotificationPermission({secureContext:false},memory())).enabled,false)
})

function audioBrowser(){
 const notes=[],vibrations=[],notifications=[],contexts=[]
 class AudioContext{
  state='suspended';currentTime=10;destination={};resume(){this.state='running';return Promise.resolve()}
  constructor(){contexts.push(this)}
  createOscillator(){const note={};notes.push(note);return {frequency:{setValueAtTime(value,time){Object.assign(note,{frequency:value,time})}},connect(){},start(time){note.start=time},stop(time){note.stop=time},disconnect(){}}}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}
 }
 const notification={permission:'granted',requestPermission:async()=>{throw Error('Must not request automatically')},create(title,options){notifications.push({title,options})}}
 return {notes,vibrations,notifications,contexts,browser:{audioConstructor:AudioContext,vibrate:pattern=>{vibrations.push(pattern);return true},notification,secureContext:true}}
}

test('audio requires explicit unlock, cues differ by mode, and all preferences gate their browser side effects',async()=>{
 const {createReminderRuntime}=api(runtimeApi),fake=audioBrowser(),runtime=createReminderRuntime(fake.browser)
 runtime.play('focus',settings,'before-unlock');assert.equal(fake.notes.length,0)
 await runtime.unlockAudio()
 runtime.play('focus',{...settings,notifications:true},'focus')
 const focus=fake.notes.map(n=>n.frequency)
 assert.ok(focus.length>0);assert.ok(fake.notes.every(n=>n.stop-n.start<1))
 fake.notes.length=0
 runtime.play('break',settings,'break')
 assert.notDeepEqual(fake.notes.map(n=>n.frequency),focus)
 assert.equal(fake.notifications.length,1);assert.equal(fake.notifications[0].options.tag,'unilife-pomodoro:focus')
 fake.notes.length=0;fake.vibrations.length=0
 runtime.play('focus',{...settings,sound:false,vibration:false,notifications:false},'off')
 assert.equal(fake.notes.length,0);assert.equal(fake.vibrations.length,0);assert.equal(fake.notifications.length,1)
})

test('unsupported or throwing optional browser APIs do not prevent page fallback completion',async()=>{
 const {createReminderRuntime}=api(runtimeApi)
 const runtime=createReminderRuntime({secureContext:false,vibrate(){throw Error('unsupported')}})
 await assert.doesNotReject(()=>runtime.unlockAudio())
 assert.doesNotThrow(()=>runtime.play('focus',{...settings,notifications:true},'fallback'))
 const {commitTimerWithReminder}=api(completionApi),before=start(),action={type:'complete',cycleId:'focus-cycle'},after=transitionPomodoro(before,action,62000).pomodoro
 let persisted=null
 const result=commitTimerWithReminder(before,after,action,62000,()=>{persisted=after;return null},{storage:memory(),runtime})
 assert.equal(result.storageError,null);assert.ok(persisted.notice)
})

test('restricted optional browser API getters cannot crash the settings panel or request permission',async()=>{
 const {reminderBrowser,requestReminderNotificationPermission}=api(runtimeApi)
 const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator')
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true,get Notification(){throw Error('restricted')},get AudioContext(){throw Error('restricted')}}})
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get vibrate(){throw Error('restricted')}}})
 try {
  assert.doesNotThrow(()=>reminderBrowser())
  const browser=reminderBrowser()
  assert.equal(browser.notification,undefined);assert.equal(browser.audioConstructor,undefined);assert.equal(browser.vibrate,undefined)
  const result=await requestReminderNotificationPermission({secureContext:true,notification:{get permission(){throw Error('restricted')},requestPermission(){throw Error('Must not request')},create(){}}},memory())
  assert.equal(result.enabled,false);assert.ok(result.error)
 } finally {
  if(priorWindow)Object.defineProperty(globalThis,'window',priorWindow);else delete globalThis.window
  if(priorNavigator)Object.defineProperty(globalThis,'navigator',priorNavigator);else delete globalThis.navigator
 }
})
