import { initialPomodoro } from '../src/features/pomodoro/pomodoroUtils.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readCourseStorage, writeCourseStorage } from '../src/features/courses/courseStorage.ts'
import * as semesters from '../src/features/semester/semesterUtils.ts'
const tasks = await import('../src/features/tasks/taskUtils.ts').catch(() => null)
const transactions = await import('../src/features/courses/hubTransactions.ts').catch(() => null)

const legacySemester = { name: '第一学期', startDate: '2026-09-07', totalWeeks: 20 }
const legacyCourse = { id:'c1',name:'数学',weekday:1,startTime:'08:00',endTime:'09:40',teacher:'张老师',classroom:'A203',color:'blue',note:'原笔记',createdAt:'2026-09-01T00:00:00Z',weeks:[1,3,5],weekMode:'odd' }
test('v2 snapshot becomes independent semesters with stable membership and retains every old field', () => {
  const raw = JSON.stringify({version:2,semester:legacySemester,courses:[legacyCourse]})
  const store = {getItem:()=>raw}
  const result = readCourseStorage(store)
  assert.equal(result.error,null)
  assert.equal(result.data.version,5)
  assert.equal(result.data.semesters.length,1)
  const semester = result.data.semesters[0]
  assert.equal(result.data.courses[0].semesterId,semester.id)
  assert.deepEqual(result.data.courses[0],{...legacyCourse,semesterId:semester.id})
  assert.deepEqual(result.data.tasks,[])
  assert.equal(readCourseStorage(store).data.semesters[0].id,semester.id)
})
const first = {...legacySemester,id:'s1'}
const second = {id:'s2',name:'第二学期',startDate:'2027-02-22',totalWeeks:20}
const task = (changes={}) => ({id:'t1',type:'todo',title:'整理笔记',description:'',semesterId:null,courseId:null,dueDate:null,dueTime:null,priority:'normal',status:'pending',createdAt:'2026-10-04T00:00:00Z',completedAt:null,...changes})
test('default semester follows date, gaps choose nearest without pretending to be active',()=>{
  assert.equal(typeof semesters.selectDefaultSemester,'function')
  assert.equal(semesters.selectDefaultSemester([first,second],new Date(2027,2,15)).semester.id,'s2')
  const gap=semesters.selectDefaultSemester([first,second],new Date(2027,1,1))
  assert.equal(gap.isWithin,false)
  assert.equal(gap.semester.id,'s1')
  assert.equal(semesters.selectDefaultSemester([],new Date()).semester,null)
  assert.equal(semesters.semesterEndDate({...first,startDate:'2026-09-09'}),'2027-01-24')
  assert.equal(semesters.findSemesterOverlaps({...second,startDate:'2027-01-24'},[first]).length,1)
  assert.equal(semesters.findSemesterOverlaps({...second,startDate:'2027-01-25'},[first]).length,0)
})
test('task validates membership, optional deadline, time requires date, all priorities',()=>{
  assert.ok(tasks,'task business module is required')
  const courses=[{...legacyCourse,semesterId:'s1'}]
  assert.deepEqual(tasks.validateTask(task(),[first,second],courses),{})
  for(const priority of ['low','normal','high','urgent']) assert.deepEqual(tasks.validateTask(task({priority}),[first],courses),{})
  for(const change of [{title:' '},{dueTime:'12:00'},{dueDate:'2026-02-29'},{dueDate:'2026-10-10',dueTime:'24:00'},{type:'bad'},{priority:'bad'},{type:'assignment',semesterId:null},{type:'assignment',semesterId:'s2',courseId:'c1'},{courseId:'c1'}]) assert.ok(Object.keys(tasks.validateTask(task(change),[first,second],courses)).length)
  assert.deepEqual(tasks.validateTask(task({type:'assignment',semesterId:'s1',courseId:'c1'}),[first],courses),{})
})
test('due boundaries use local calendar day; completed and undated never overdue',()=>{
  assert.ok(tasks)
  const dateOnly=task({dueDate:'2026-10-10'})
  assert.equal(tasks.isOverdue(dateOnly,new Date(2026,9,10,23,59,59,999)),false)
  assert.equal(tasks.isOverdue(dateOnly,new Date(2026,9,11)),true)
  const exact=task({dueDate:'2026-10-10',dueTime:'12:00'})
  assert.equal(tasks.isOverdue(exact,new Date(2026,9,10,12)),false)
  assert.equal(tasks.isOverdue(exact,new Date(2026,9,10,12,0,1)),true)
  assert.equal(tasks.isOverdue(task(),new Date(2030,0,1)),false)
  assert.equal(tasks.isOverdue({...dateOnly,status:'completed',completedAt:'2026-10-10T00:00:00Z'},new Date(2030,0,1)),false)
  assert.match(tasks.dueLabel(task({dueDate:'2026-10-11'}),new Date(2026,9,10)),/明天/)
  assert.match(tasks.dueLabel(task({dueDate:'2026-10-13'}),new Date(2026,9,10)),/3/)
})
test('filter combines semester/global, status/type, course-name search and course ID',()=>{
  assert.ok(tasks)
  const items=[task(),task({id:'t2',type:'assignment',semesterId:'s1',courseId:'c1',title:'做题',dueDate:'2026-10-04'}),task({id:'t3',semesterId:'s2'}),task({id:'t4',status:'completed',completedAt:'2026-10-03T00:00:00Z'})]
  const options={semesterId:'s1',status:'all',type:'all',search:'',courseId:null}
  const now=new Date(2026,9,4,8)
  const courses=[{...legacyCourse,semesterId:'s1'}]
  assert.deepEqual(tasks.filterTasks(items,options,courses,now).map(x=>x.id),['t2','t1','t4'])
  assert.deepEqual(tasks.filterTasks(items,{...options,search:'数学'},courses,now).map(x=>x.id),['t2'])
  assert.equal(tasks.filterTasks(items,{...options,type:'todo',status:'today'},courses,now).length,0)
  assert.deepEqual(tasks.filterTasks(items,{...options,courseId:'c1'},courses,now).map(x=>x.id),['t2'])
  assert.deepEqual(tasks.taskStats(items.filter(x=>x.semesterId!=='s2'),now),{pending:2,today:1,overdue:0,completed:1})
})
test('sort puts overdue then recent then undated then completed, ties by priority',()=>{
  assert.ok(tasks)
  const items=[task({id:'done',status:'completed',completedAt:'2026-10-03T00:00:00Z',dueDate:'2026-10-01'}),task({id:'undated'}),task({id:'tomorrow',dueDate:'2026-10-05'}),task({id:'today',dueDate:'2026-10-04'}),task({id:'old',dueDate:'2026-10-03'}),task({id:'urgent',dueDate:'2026-10-04',priority:'urgent'})]
  assert.deepEqual(tasks.sortTasks(items).map(x=>x.id),['old','urgent','today','tomorrow','undated','done'])
  assert.equal(items[0].id,'done')
})
test('course deletion retains assignments with lost association; semester deletion makes them global atomically',()=>{
  assert.ok(transactions,'atomic operations module is required')
  const data={version:5,studyRecords:[],pomodoro:initialPomodoro(),semesters:[first,second],courses:[{...legacyCourse,semesterId:'s1'}],tasks:[task({type:'assignment',semesterId:'s1',courseId:'c1'})],exams:[]}
  const courseDeleted=transactions.withoutCourse(data,'c1')
  assert.equal(courseDeleted.tasks.length,1)
  assert.equal(courseDeleted.tasks[0].courseId,null)
  assert.match(courseDeleted.tasks[0].associationNote,/已删除/)
  assert.equal(courseDeleted.tasks[0].semesterId,'s1')
  const semesterDeleted=transactions.withoutSemester(data,'s1')
  assert.equal(semesterDeleted.courses.length,0)
  assert.equal(semesterDeleted.tasks[0].semesterId,null)
  assert.equal(semesterDeleted.tasks[0].courseId,null)
  assert.equal(semesterDeleted.tasks[0].id,'t1')
  assert.equal(semesterDeleted.tasks[0].type,'todo')
  assert.equal(data.tasks[0].courseId,'c1')
})
test('current snapshot validates task schema, dangling memberships, duplicate IDs and completedAt without rewriting bad data',()=>{
  const data={version:5,studyRecords:[],pomodoro:initialPomodoro(),semesters:[first,second],courses:[{...legacyCourse,semesterId:'s1'}],tasks:[task({type:'assignment',semesterId:'s1',courseId:'c1'})],exams:[]}
  const store={value:JSON.stringify(data),getItem(){return this.value},setItem(key,value){this.value=value}}
  assert.deepEqual(readCourseStorage(store).data,data)
  assert.equal(writeCourseStorage(data,store),null)
  assert.deepEqual(readCourseStorage(store).data,data)
  for(const changes of [{priority:'bad'},{status:'bad'},{completedAt:'2026-10-01'},{semesterId:'missing'},{courseId:'missing'},{dueDate:'2026-02-29'},{title:1},{dueTime:23}]) {
    const raw=JSON.stringify({...data,tasks:[task(changes)]})
    store.value=raw
    assert.ok(readCourseStorage(store).error)
    assert.equal(store.value,raw)
  }
  for(const changes of [{tasks:[task(),task()]},{semesters:[first,first]},{courses:[{...legacyCourse,semesterId:'missing'}]}]) {
    store.value=JSON.stringify({...data,...changes});assert.ok(readCourseStorage(store).error)
  }
})
test('migration persists once in current version and course IDs, weeks, tasks survive reopening',()=>{
  const store={value:JSON.stringify({version:2,semester:legacySemester,courses:[legacyCourse]}),getItem(){return this.value},setItem(key,value){this.value=value}}
  const loaded=readCourseStorage(store)
  assert.equal(loaded.needsMigration,true)
  assert.equal(writeCourseStorage(loaded.data,store),null)
  assert.equal(readCourseStorage(store).needsMigration,undefined)
  assert.deepEqual(readCourseStorage(store).data,loaded.data)
})
