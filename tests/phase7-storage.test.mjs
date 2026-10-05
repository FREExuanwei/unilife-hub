import test from 'node:test'
import assert from 'node:assert/strict'
import { readCourseStorage } from '../src/features/courses/courseStorage.ts'
import { initialPomodoro } from '../src/features/pomodoro/pomodoroUtils.ts'
const sem={id:'s',name:'秋季',startDate:'2026-09-01',totalWeeks:20}
const raw=()=>({version:5,semesters:[sem],courses:[],tasks:[],exams:[],studyRecords:[],pomodoro:initialPomodoro()})
const read=value=>readCourseStorage({getItem:()=>JSON.stringify(value)})
test('a damaged exam list preserves readable independent semester/task/study modules and raw storage',()=>{
 const d={...raw(),exams:'broken'};const loaded=read(d)
 assert.ok(loaded.error);assert.deepEqual(loaded.data.semesters,[sem]);assert.deepEqual(loaded.data.tasks,[])
 assert.match(loaded.error,/考试/)
})
test('unknown future schema never becomes a writable empty snapshot',()=>{
 const d={...raw(),version:999};assert.ok(read(d).error);assert.equal(read(d).needsMigration,undefined)
})
test('canonical data parsers strip unknown fields at all user-data boundaries',()=>{
 const d={...raw(),token:'secret',semesters:[{...sem,token:'secret'}],pomodoro:{...initialPomodoro(),token:'secret'}}
 const loaded=read(d);assert.equal(loaded.error,null);assert.equal(JSON.stringify(loaded.data).includes('secret'),false)
})
