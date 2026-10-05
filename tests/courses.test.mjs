import { initialPomodoro } from '../src/features/pomodoro/pomodoroUtils.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCourse, findConflicts, sortCourses, coursesForDay, weekdayOf, courseStatus, todaySummary, COURSE_COLORS } from '../src/features/courses/courseUtils.ts'
import { readCourseStorage, writeCourseStorage, COURSE_STORAGE_KEY } from '../src/features/courses/courseStorage.ts'

const semester = { id:'s1', name: '第一学期', startDate: '2026-09-07', totalWeeks: 20 }
const course = (id, changes = {}) => ({ id, semesterId:'s1', name: '高等数学', weekday: 1, startTime: '08:00', endTime: '09:40', teacher: '张老师', classroom: 'A203', color: 'blue', note: '带教材', createdAt: '2026-10-03T00:00:00.000Z', weeks: Array.from({length:20},(_,i)=>i+1), weekMode:'every', ...changes })
function storage(initial = null) {
  let value = initial
  return { getItem: () => value, setItem: (key, next) => { assert.equal(key, COURSE_STORAGE_KEY); value = next } }
}

test('required fields, strict clock times, end-after-start and weekdays are validated', () => {
  assert.deepEqual(validateCourse(course('a')), {})
  for (const changes of [{ name: ' ' }, { weekday: 0 }, { weekday: 8 }, { startTime: '8:00' }, { startTime: '24:00' }, { endTime: '08:00' }, { endTime: '07:00' }, { endTime: '' }, { color: 'random' }, { name: 'a'.repeat(81) }]) {
    assert.ok(Object.keys(validateCourse(course('a', changes))).length, JSON.stringify(changes))
  }
  assert.deepEqual(validateCourse(course('a', { teacher: '', classroom: '', note: '', startTime: '00:00', endTime: '23:59' })), {})
})
test('conflicts include partial overlap, containment and exact matches, but exclude adjacent times and self', () => {
  const items = [course('a'), course('b', { startTime: '09:40', endTime: '10:30' }), course('c', { weekday: 2 })]
  assert.deepEqual(findConflicts(course('x', { startTime: '09:00', endTime: '10:00' }), items).map(x => x.id), ['a', 'b'])
  assert.equal(findConflicts(course('x', { startTime: '07:00', endTime: '11:00' }), items).length, 2)
  assert.deepEqual(findConflicts(course('a'), items, 'a'), [])
  assert.deepEqual(findConflicts(course('x'), [course('a')]).map(x => x.id), ['a'])
})
test('sort is stable, immutable and chronological; each weekday can be selected', () => {
  const items = [course('z', { startTime: '14:00', endTime: '15:00' }), course('b'), course('a', { weekday: 7 })]
  assert.deepEqual(sortCourses(items).map(x => x.id), ['b', 'z', 'a'])
  assert.deepEqual(items.map(x => x.id), ['z', 'b', 'a'])
  assert.deepEqual(coursesForDay(items, 1).map(x => x.id), ['b', 'z'])
  assert.equal(coursesForDay(items, 7)[0].id, 'a')
})
test('local weekdays handle Sunday, Monday and midnight without UTC conversion', () => {
  assert.equal(weekdayOf(new Date(2026, 9, 4, 0, 0)), 7)
  assert.equal(weekdayOf(new Date(2026, 9, 5, 0, 0)), 1)
  assert.equal(weekdayOf(new Date(2026, 9, 3, 23, 59)), 6)
})
test('course state uses exact start/end boundaries', () => {
  const item = course('a')
  assert.equal(courseStatus(item, new Date(2026, 9, 5, 7, 59)), 'upcoming')
  assert.equal(courseStatus(item, new Date(2026, 9, 5, 8, 0)), 'ongoing')
  assert.equal(courseStatus(item, new Date(2026, 9, 5, 9, 40)), 'ended')
})
test('today summary identifies next, ongoing, empty and all-ended courses', () => {
  const items = [course('pm', { startTime: '14:00', endTime: '15:30' }), course('am'), course('other', { weekday: 2 })]
  let result = todaySummary(items, new Date(2026, 9, 5, 8, 15), semester)
  assert.equal(result.today.length, 2)
  assert.equal(result.ongoing[0].id, 'am')
  assert.equal(result.next.id, 'pm')
  assert.equal(result.finished, false)
  result = todaySummary(items, new Date(2026, 9, 5, 14, 15), semester)
  assert.equal(result.next, undefined)
  assert.equal(result.finished, false)
  assert.equal(todaySummary(items, new Date(2026, 9, 5, 16), semester).finished, true)
  assert.equal(todaySummary(items, new Date(2026, 9, 7), semester).today.length, 0)
})
test('first launch is empty, all seven preset colors are available', () => {
  assert.deepEqual(readCourseStorage(storage()), { data: { version: 5, studyRecords:[], pomodoro:initialPomodoro(), semesters: [], courses: [], tasks:[], exams:[] }, error: null })
  assert.deepEqual(COURSE_COLORS.map(x => x.value), ['blue', 'purple', 'cyan', 'orange', 'pink', 'green', 'red'])
})
test('every course field and deliberately conflicting courses survive storage round trip', () => {
  const target = storage()
  const data = { version: 5, studyRecords:[], pomodoro:initialPomodoro(), semesters:[semester], tasks:[], exams:[], courses: [course('a'), course('b', { color: 'pink' })] }
  assert.equal(writeCourseStorage(data, target), null)
  assert.deepEqual(readCourseStorage(target).data, data)
  assert.equal(writeCourseStorage({ version: 5, studyRecords:[], pomodoro:initialPomodoro(), semesters:[semester], tasks:[], exams:[], courses: [] }, target), null)
  assert.deepEqual(readCourseStorage(target).data.courses, [])
})
test('malformed, unsafe, duplicate and invalid data never overwrite existing storage', () => {
  for (const raw of ['{bad', JSON.stringify({ version: 2, courses: [] }), JSON.stringify({ version: 1, courses: [course('a', { weekday: '1' })] }), JSON.stringify({ version: 1, courses: [course('a'), course('a')] }), JSON.stringify({ version: 1, courses: [course('a', { color: '__proto__' })] }), JSON.stringify({ version: 1, courses: [course('a', { endTime: '07:00' })] })]) {
    const target = storage(raw)
    assert.ok(readCourseStorage(target).error)
    assert.equal(target.getItem(COURSE_STORAGE_KEY), raw)
  }
})
test('unavailable reads and quota failures produce errors', () => {
  const target = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('quota') } }
  assert.ok(readCourseStorage(target).error)
  assert.ok(writeCourseStorage({ version: 2, semester, courses: [] }, target))
})
