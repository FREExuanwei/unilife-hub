import { initialPomodoro } from '../src/features/pomodoro/pomodoroUtils.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import * as weeks from '../src/features/semester/weekUtils.ts'
import { validateSemester, applySemester, affectedCourses } from '../src/features/semester/semesterUtils.ts'
import { todaySummary, findConflicts, validateCourse } from '../src/features/courses/courseUtils.ts'
import { readCourseStorage, writeCourseStorage } from '../src/features/courses/courseStorage.ts'

const semester = { id:'s1', name: '2026-2027 第一学期', startDate: '2026-09-07', totalWeeks: 20 }
const course = (changes = {}) => ({ id: 'a', semesterId:'s1', name: '高等数学', weekday: 2, startTime: '08:00', endTime: '09:40', teacher: '张老师', classroom: 'A203', color: 'blue', note: '教材', createdAt: '2026-09-01T00:00:00Z', weeks: [1,2,3], weekMode: 'every', ...changes })
const store = raw => ({ value: raw, getItem() { return this.value }, setItem(key, value) { this.value = value } })
test('semester validates true local calendar dates and integer 1–30 weeks', () => {
  assert.deepEqual(validateSemester(semester), {})
  for (const totalWeeks of [0,-1,31,100000,NaN,2.5,'20']) assert.ok(validateSemester({...semester,totalWeeks}).totalWeeks)
  for (const startDate of ['2026-02-29','2026-13-01','bad','']) assert.ok(validateSemester({...semester,startDate}).startDate)
  assert.ok(validateSemester({...semester,name:' '}).name)
})
test('Monday weeks handle start, Sunday, next Monday, before and after semester', () => {
  assert.deepEqual(weeks.calculateCurrentWeek(semester,new Date(2026,8,6)),{status:'before',week:null})
  assert.equal(weeks.calculateCurrentWeek(semester,new Date(2026,8,7)).week,1)
  assert.equal(weeks.calculateCurrentWeek(semester,new Date(2026,8,13,23,59)).week,1)
  assert.equal(weeks.calculateCurrentWeek(semester,new Date(2026,8,14)).week,2)
  assert.equal(weeks.calculateCurrentWeek(semester,new Date(2026,9,5)).week,5)
  assert.deepEqual(weeks.calculateCurrentWeek(semester,new Date(2027,0,25)),{status:'after',week:null})
  assert.equal(weeks.calculateCurrentWeek({...semester,startDate:'2026-09-09'},new Date(2026,8,14)).week,2)
  assert.equal(weeks.calculateCurrentWeek(null,new Date()).status,'unset')
})
test('every, odd, even and invalid ranges generate actual weeks', () => {
  assert.deepEqual(weeks.generateWeeks('every',1,3,20),[1,2,3])
  assert.deepEqual(weeks.generateWeeks('odd',1,8,20),[1,3,5,7])
  assert.deepEqual(weeks.generateWeeks('even',1,8,20),[2,4,6,8])
  for(const range of [[0,5],[5,4],[1,21],[1.5,4]]) assert.deepEqual(weeks.generateWeeks('every',...range,20),[])
  assert.match(weeks.formatWeeks([1,3,5,7]),/单周/)
  assert.match(weeks.formatWeeks([2,4,6,8]),/双周/)
  assert.match(weeks.formatWeeks([1,2,5,8,11]),/1、2、5、8、11/)
})
test('same time in disjoint weeks is allowed; overlap and adjacency are exact', () => {
  assert.deepEqual(findConflicts(course({id:'b',weeks:[4,5,6,7,8]}),[course()]),[])
  assert.equal(findConflicts(course({id:'b',weeks:[3,4]}),[course()]).length,1)
  assert.deepEqual(weeks.getOverlappingWeeks([1,2,3,4,5],[4,5,6]),[4,5])
  assert.deepEqual(findConflicts(course({id:'b',startTime:'09:40',endTime:'10:40'}),[course()]),[])
  assert.deepEqual(findConflicts(course(),[course()],'a'),[])
})
test('course validation rejects empty, duplicate, out-of-range weeks and inconsistent modes', () => {
  assert.deepEqual(validateCourse(course(),20),{})
  for(const value of [[],[0],[21],[1,1],[1.5],['1']]) assert.ok(validateCourse(course({weeks:value}),20).weeks)
  assert.ok(validateCourse(course({weekMode:'odd',weeks:[1,2,3]}),20).weeks)
})
test('today and home exclude expired/future weeks and other weekdays', () => {
  const items=[course(),course({id:'b',weeks:[4,5,6,7,8]}),course({id:'c',weekday:1,weeks:[5]})]
  const summary=todaySummary(items,new Date(2026,9,6,7),semester)
  assert.deepEqual(summary.today.map(x=>x.id),['b'])
  assert.equal(summary.next.id,'b')
  assert.equal(todaySummary(items,new Date(2026,8,6),semester).today.length,0)
  assert.equal(todaySummary(items,new Date(2027,1,2),semester).today.length,0)
  assert.equal(todaySummary(items,new Date(2026,9,6),null).today.length,0)
})
test('shortening semester keeps all course identities including wholly out-of-range courses', () => {
  const data={version:5,studyRecords:[],pomodoro:initialPomodoro(),semesters:[semester],tasks:[],exams:[],courses:[course({weeks:[1,16,17,20],weekMode:'custom'}),course({id:'b',weeks:[17,18,19,20]})]}
  const nextSemester={...semester,totalWeeks:16}
  assert.equal(affectedCourses(data.courses,16).length,2)
  const next=applySemester(data,nextSemester)
  assert.deepEqual(next.courses[0].weeks,[1,16])
  assert.deepEqual(next.courses[1].weeks,[])
  assert.equal(next.courses[1].name,'高等数学')
  assert.equal(next.courses[1].id,'b')
  assert.deepEqual(data.courses[1].weeks,[17,18,19,20])
})
test('legacy data waits for semester then migrates without changing IDs, notes or dates', () => {
  const {weeks: ignored,weekMode: ignoredMode,...legacy}=course()
  const storage=store(JSON.stringify({version:1,courses:[legacy]}))
  const original=storage.value
  const loaded=readCourseStorage(storage)
  assert.equal(loaded.error,null)
  assert.deepEqual(loaded.data.semesters,[])
  assert.equal(storage.value,original)
  const migrated=applySemester(loaded.data,semester)
  assert.deepEqual(migrated.courses[0].weeks,Array.from({length:20},(_,i)=>i+1))
  assert.equal(migrated.courses[0].id,legacy.id)
  assert.equal(migrated.courses[0].note,legacy.note)
  assert.equal(migrated.courses[0].createdAt,legacy.createdAt)
  assert.equal(writeCourseStorage(migrated,storage),null)
  assert.deepEqual(readCourseStorage(storage).data,migrated)
})
test('corrupt semester/week data remains untouched and unavailable storage preserves snapshot', () => {
  for(const change of [{semester:{...semester,totalWeeks:0}},{courses:[course({weeks:[31]})]},{courses:[course({weeks:'1-3'})]},{courses:[course({weekMode:'bad'})]}]) {
    const raw=JSON.stringify({version:2,semester,courses:[course()],...change})
    const storage=store(raw)
    assert.ok(readCourseStorage(storage).error)
    assert.equal(storage.value,raw)
  }
  assert.ok(writeCourseStorage({version:2,semester,courses:[course()]},{setItem(){throw Error('quota')}}))
})
