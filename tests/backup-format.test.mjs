import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBackup, createBackup, backupStorageValues, resetStorageValues, backupFilename } from '../src/features/backup/backupUtils.ts'
import { initialPomodoro, transitionPomodoro } from '../src/features/pomodoro/pomodoroUtils.ts'
import { DEFAULT_REMINDER_SETTINGS } from '../src/features/reminders/reminderStorage.ts'
const hub=()=>({version:5,semesters:[],courses:[],tasks:[],exams:[],studyRecords:[],pomodoro:initialPomodoro()})
const backup=()=>({appName:'UniLife Hub',backupVersion:1,schemaVersion:5,exportedAt:'2026-10-04T10:00:00.000Z',data:{hub:hub(),bookmarks:{version:1,bookmarks:[],categories:['自定义']},theme:'dark',reminders:{...DEFAULT_REMINDER_SETTINGS,sound:false}}})
const parse=value=>parseBackup(JSON.stringify(value))
test('backup round trip preserves every section/settings and omits runtime/unknown properties',()=>{
 const b=backup();b.data.hub.secret='token';b.data.secret='token';b.data.hub.pomodoro=transitionPomodoro(initialPomodoro(),{type:'start',cycleId:'live',title:'进行中',courseId:null,semesterId:null,courseNameSnapshot:''},Date.now()).pomodoro
 const restored=parse(b);assert.equal(restored.data.hub.pomodoro.state.status,'idle');assert.equal(restored.data.hub.pomodoro.notice,null)
 assert.equal(restored.data.theme,'dark');assert.equal(restored.data.reminders.sound,false);assert.ok(restored.data.bookmarks.categories.includes('自定义'))
 assert.equal(JSON.stringify(restored).includes('token'),false);assert.equal(JSON.stringify(restored).includes('live'),false)
 const values=backupStorageValues(restored.data),storage={getItem:k=>values[k]??null}
 assert.deepEqual(createBackup(storage,new Date(b.exportedAt)).data,restored.data)
})
test('invalid files, version mismatch, dangerous links and future schema never import',()=>{
 for(const value of [null,{}, {...backup(),appName:'Other'}, {...backup(),backupVersion:0}, {...backup(),schemaVersion:4}, {...backup(),exportedAt:'invalid'}, {...backup(),data:{}}, {...backup(),data:{...backup().data,theme:'invalid'}}])assert.throws(()=>parse(value))
 for(const text of ['not json','[]','{}'])assert.throws(()=>parseBackup(text))
 assert.throws(()=>parse({...backup(),schemaVersion:99}),/更新版本/)
 assert.throws(()=>parse({...backup(),backupVersion:2}),/更新版本/)
 const b=backup();b.data.bookmarks.bookmarks=[{id:'x',name:'x',url:'javascript:alert(1)',category:'学习',note:'',isPinned:false,icon:'default',createdAt:b.exportedAt}];assert.throws(()=>parse(b))
})
test('old v1–4 backup structures migrate through existing migrations',()=>{
 for(const version of [1,2,3,4]){
  const b=backup();b.schemaVersion=version;b.data.hub={version,courses:[],...(version===2?{semester:null}:{}),...(version>=3?{semesters:[],tasks:[]}:{}),...(version>=4?{exams:[]}:{})};delete b.data.reminders
  const restored=parse(b);assert.equal(restored.schemaVersion,5);assert.deepEqual(restored.data.hub.studyRecords,[]);assert.deepEqual(restored.data.reminders,DEFAULT_REMINDER_SETTINGS)
 }
})
test('reset values are valid empty snapshots, no samples return; filename uses local date and time',()=>{
 const s=resetStorageValues();const b=createBackup({getItem:k=>s[k]??null});assert.equal(b.data.theme,'system');assert.equal(b.data.hub.semesters.length,0);assert.equal(b.data.bookmarks.bookmarks.length,0)
 assert.equal(backupFilename(new Date(2026,9,4,10,30,5)),'unilife-hub-backup-2026-10-04-103005.json')
})
test('older schema5 backup without newly introduced reminder preferences receives defaults',()=>{
 const b=backup();delete b.data.reminders;assert.deepEqual(parse(b).data.reminders,DEFAULT_REMINDER_SETTINGS)
})
