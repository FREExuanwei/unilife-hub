import { initialPomodoro } from '../src/features/pomodoro/pomodoroUtils.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readCourseStorage, writeCourseStorage, COURSE_STORAGE_KEY } from '../src/features/courses/courseStorage.ts'
const exams = await import('../src/features/exams/examUtils.ts').catch(() => null)
const storage = await import('../src/features/exams/examStorage.ts').catch(() => null)
const transactions = await import('../src/features/courses/hubTransactions.ts')

const first = { id:'s1', name:'秋季学期', startDate:'2026-09-07', totalWeeks:20 }
const second = { id:'s2', name:'春季学期', startDate:'2027-02-22', totalWeeks:20 }
const course = { id:'c1', semesterId:'s2', name:'高等数学', weekday:1, startTime:'08:00', endTime:'09:40', teacher:'张老师', classroom:'A203', color:'blue', note:'原笔记', createdAt:'2026-09-01T00:00:00Z', weeks:[1,3,5], weekMode:'odd' }
const exam = (changes={}) => ({ id:'e1', semesterId:'s2', courseId:null, title:'春季测试', examType:'final', examDate:'2027-03-15', startTime:null, endTime:null, location:'A203', seat:'18', note:'带证件', createdAt:'2027-03-01T00:00:00Z', updatedAt:'2027-03-01T00:00:00Z', ...changes })
const task = (changes={}) => ({id:'t1',type:'todo',title:'整理笔记',description:'',semesterId:null,courseId:null,dueDate:null,dueTime:null,priority:'normal',status:'pending',createdAt:'2026-10-04T00:00:00Z',completedAt:null,...changes})
const snapshot = (changes={}) => ({version:5,studyRecords:[],pomodoro:initialPomodoro(),semesters:[first,second],courses:[course],tasks:[task()],exams:[exam()],...changes})
const memory = value => ({value, keys:[], getItem(key){this.keys.push(key);return this.value}, setItem(key,value){this.keys.push(key);this.value=value}})

test('exam module validates required semester, optional matching course, strict dates and optional times', () => {
  assert.ok(exams,'independent examUtils module is required')
  assert.deepEqual(exams.validateExam(exam(),[first,second],[course]),{})
  for (const examType of ['midterm','final','quiz','resit','qualification','other']) assert.deepEqual(exams.validateExam(exam({examType}),[first,second],[course]),{})
  for (const changes of [{title:' '},{title:'x'.repeat(121)},{semesterId:null},{semesterId:'missing'},{courseId:'missing'},{semesterId:'s1',courseId:'c1'},{examType:'bad'},{examDate:'2027-02-29'},{examDate:'2027-3-15'},{startTime:'24:00'},{endTime:'12:60'},{startTime:'14:00',endTime:'13:00'},{startTime:'14:00',endTime:'14:00'}]) assert.ok(Object.keys(exams.validateExam(exam(changes),[first,second],[course])).length,JSON.stringify(changes))
  assert.deepEqual(exams.validateExam(exam({courseId:'c1',startTime:'09:00',endTime:'10:30'}),[first,second],[course]),{})
  assert.deepEqual(exams.validateExam(exam({startTime:'09:00'}),[first,second],[course]),{})
  assert.deepEqual(exams.validateExam(exam({endTime:'10:30'}),[first,second],[course]),{})
})
test('exam status uses local day and exact supplied end, never fabricates missing duration',()=>{
  assert.ok(exams)
  const full=exam({startTime:'09:00',endTime:'10:30'})
  for(const [now,status] of [[new Date(2027,2,14,23,59,59,999),'upcoming'],[new Date(2027,2,15,8,59,59,999),'today'],[new Date(2027,2,15,9),'ongoing'],[new Date(2027,2,15,10,29,59,999),'ongoing'],[new Date(2027,2,15,10,30),'ended'],[new Date(2027,2,16),'ended']]) assert.equal(exams.getExamStatus(full,now),status)
  assert.equal(exams.getExamStatus(exam(),new Date(2027,2,15,23,59,59,999)),'today')
  assert.equal(exams.getExamStatus(exam(),new Date(2027,2,16)),'ended')
  assert.equal(exams.getExamStatus(exam({startTime:'09:00'}),new Date(2027,2,15,22)),'today')
  assert.equal(exams.getExamStatus(exam({endTime:'10:30'}),new Date(2027,2,15,10,30)),'ended')
})
test('calendar countdown and urgency agree through tomorrow, week and exact end boundaries',()=>{
  assert.ok(exams)
  const now=new Date(2027,2,15,7)
  assert.match(exams.getExamCountdown(exam({examDate:'2027-04-01'}),now),/17/)
  assert.match(exams.getExamCountdown(exam({examDate:'2027-03-18'}),now),/3/)
  assert.match(exams.getExamCountdown(exam({examDate:'2027-03-16'}),now),/明天/)
  assert.match(exams.getExamCountdown(exam(),now),/今天/)
  assert.match(exams.getExamCountdown(exam({startTime:'10:25'}),now),/3.*小时.*25.*分钟/)
  assert.match(exams.getExamCountdown(exam({startTime:'06:00',endTime:'08:00'}),now),/进行中/)
  assert.match(exams.getExamCountdown(exam({startTime:'06:00',endTime:'07:00'}),now),/已结束/)
  assert.match(exams.getExamCountdown(exam({startTime:'06:00'}),now),/今天/)
  for(const [examDate,urgency]of[['2027-03-23','calm'],['2027-03-22','soon'],['2027-03-18','soon'],['2027-03-17','urgent'],['2027-03-16','urgent'],['2027-03-15','today'],['2027-03-14','ended']]) assert.equal(exams.getExamUrgency(exam({examDate}),now),urgency)
  assert.doesNotMatch(exams.getExamCountdown(exam({examDate:'2026-01-01'}),now),/-\d/)
})
test('dates stay local and use calendar days through leap day, month end and DST changes',()=>{
  assert.ok(exams)
  const oldTZ=process.env.TZ
  try{
    for(const zone of ['Asia/Shanghai','America/New_York','Pacific/Honolulu']){
      process.env.TZ=zone
      assert.equal(exams.getExamStatus(exam({examDate:'2028-02-29'}),new Date(2028,1,29,0,0)),'today')
      assert.match(exams.getExamCountdown(exam({examDate:'2027-04-01'}),new Date(2027,2,31,23,59)),/明天/)
      assert.match(exams.getExamCountdown(exam({examDate:'2027-03-15'}),new Date(2027,2,13,23,59)),/2/)
      assert.equal(exams.getExamStatus(exam({examDate:'2027-03-15'}),new Date(2027,2,16,0,0)),'ended')
    }
  }finally{if(oldTZ===undefined)delete process.env.TZ;else process.env.TZ=oldTZ}
})
test('outside-semester warning checks both boundaries without hard-blocking valid special exams',()=>{
  assert.ok(exams)
  for(const date of ['2027-02-22','2027-07-11'])assert.equal(exams.isExamOutsideSemester(exam({examDate:date}),second),false)
  for(const date of ['2027-02-21','2027-07-12']){
    const item=exam({examDate:date});assert.equal(exams.isExamOutsideSemester(item,second),true)
    assert.deepEqual(exams.validateExam(item,[first,second],[course]),{})
  }
})
test('date and time display provides full year and preserves each optional time',()=>{
  assert.ok(exams)
  assert.match(exams.formatExamDate(exam()),/2027.*3.*15/)
  assert.match(exams.formatExamTime(exam({startTime:'09:00',endTime:'11:00'})),/09:00.*11:00/)
  assert.match(exams.formatExamTime(exam({startTime:'09:00'})),/09:00/)
  assert.match(exams.formatExamTime(exam({endTime:'11:00'})),/11:00/)
  assert.doesNotMatch(exams.formatExamTime(exam()),/undefined|null|NaN/)
  assert.deepEqual(exams.EXAM_TYPES.map(x=>x.value).sort(),['midterm','final','quiz','resit','qualification','other'].sort())
})
test('upcoming sorting is chronological and ended sorting reverses chronology without mutating input',()=>{
  assert.ok(exams)
  const items=[exam({id:'later',examDate:'2027-03-20'}),exam({id:'afternoon',startTime:'14:00'}),exam({id:'morning',startTime:'09:00'}),exam({id:'old',examDate:'2027-03-10'}),exam({id:'older',examDate:'2027-03-09'})]
  const original=structuredClone(items)
  assert.deepEqual(exams.sortUpcomingExams(items).map(x=>x.id),['older','old','morning','afternoon','later'])
  assert.deepEqual(exams.sortEndedExams(items).map(x=>x.id),['later','afternoon','morning','old','older'])
  assert.deepEqual(items,original)
})
test('combined filters isolate semester, hide ended in today/week, search all requested fields and sort history',()=>{
  assert.ok(exams)
  const now=new Date(2027,2,15,7)
  const items=[exam({id:'old',examDate:'2027-03-13'}),exam({id:'yesterday',examDate:'2027-03-14'}),exam({id:'today-end',endTime:'07:00'}),exam({id:'today',title:'期中题目',courseId:'c1',examType:'midterm'}),exam({id:'tomorrow',examDate:'2027-03-16',location:'机房B201'}),exam({id:'seven',examDate:'2027-03-22',note:'允许公式表'}),exam({id:'eight',examDate:'2027-03-23'}),exam({id:'history',semesterId:'s1',examDate:'2027-03-16'})]
  const filters={semesterId:'s2',status:'upcoming',type:'all',search:''}
  assert.deepEqual(exams.filterExams(items,filters,[course],now).map(x=>x.id),['today','tomorrow','seven','eight'])
  assert.deepEqual(exams.filterExams(items,{...filters,status:'today'},[course],now).map(x=>x.id),['today'])
  assert.deepEqual(exams.filterExams(items,{...filters,status:'week'},[course],now).map(x=>x.id),['today','tomorrow','seven'])
  assert.deepEqual(exams.filterExams(items,{...filters,status:'ended'},[course],now).map(x=>x.id),['today-end','yesterday','old'])
  assert.equal(exams.filterExams(items,{...filters,status:'all'},[course],now).length,7)
  assert.deepEqual(exams.filterExams(items,{...filters,semesterId:'s1'},[course],now).map(x=>x.id),['history'])
  for(const [search,id]of[['  期中  ','today'],['高等数学','today'],['机房b201','tomorrow'],['公式表','seven']])assert.deepEqual(exams.filterExams(items,{...filters,search},[course],now).map(x=>x.id),[id])
  assert.deepEqual(exams.filterExams(items,{...filters,type:'midterm'},[course],now).map(x=>x.id),['today'])
  assert.deepEqual(exams.examStats(items.filter(x=>x.semesterId==='s2'),now),{upcoming:4,withinWeek:3,ended:3})
  assert.equal(exams.nextExam(items.filter(x=>x.semesterId==='s2'),now).id,'today')
  assert.ok(!exams.nextExam(items.filter(x=>['old','yesterday','today-end'].includes(x.id)),now))
})
test('v3 migration upgrades the shared old key to v5 without losing courses, semesters or tasks',()=>{
  const raw={version:3,semesters:[first,second],courses:[course],tasks:[task({description:'原任务描述'})]}
  const store=memory(JSON.stringify(raw)); const loaded=readCourseStorage(store)
  assert.equal(loaded.error,null)
  assert.equal(loaded.data.version,5)
  assert.equal(loaded.needsMigration,true)
  assert.deepEqual(loaded.data,{...raw,version:5,studyRecords:[],pomodoro:initialPomodoro(),exams:[]})
  assert.equal(writeCourseStorage(loaded.data,store),null)
  assert.deepEqual(readCourseStorage(store).data,loaded.data)
  assert.equal(readCourseStorage(store).needsMigration,undefined)
  assert.ok(store.keys.every(key=>key===COURSE_STORAGE_KEY))
})
test('semester deletion with exams requires another valid target and preserves exam identity',()=>{
  const data=snapshot({exams:[exam({courseId:'c1'})],tasks:[task({type:'assignment',semesterId:'s2',courseId:'c1'})]})
  for(const target of [undefined,null,'missing','s2']) assert.throws(()=>transactions.withoutSemester(data,'s2',target))
  const result=transactions.withoutSemester(data,'s2','s1')
  assert.equal(result.exams.length,1)
  assert.equal(result.exams[0].id,'e1')
  assert.equal(result.exams[0].semesterId,'s1')
  assert.equal(result.exams[0].courseId,null)
  assert.match(result.exams[0].associationNote,/已删除/)
  for(const key of ['title','examType','examDate','startTime','endTime','location','seat','note','createdAt']) assert.equal(result.exams[0][key],data.exams[0][key])
  assert.ok(Number.isFinite(Date.parse(result.exams[0].updatedAt)))
  assert.notEqual(result.exams[0].updatedAt,data.exams[0].updatedAt)
  assert.equal(result.tasks[0].type,'todo')
  assert.equal(result.tasks[0].semesterId,null)
  assert.equal(result.tasks[0].courseId,null)
  assert.deepEqual(data,snapshot({exams:[exam({courseId:'c1'})],tasks:[task({type:'assignment',semesterId:'s2',courseId:'c1'})]}))
})
test('legacy v1/v2 migrate course metadata and v5 valid records reopen unchanged',()=>{
  const legacyCourse={...course};delete legacyCourse.semesterId
  const v1=readCourseStorage(memory(JSON.stringify({version:1,courses:[legacyCourse]})))
  assert.equal(v1.error,null);assert.equal(v1.data.version,5);assert.equal(v1.needsMigration,true);assert.deepEqual(v1.data.exams,[])
  assert.deepEqual(v1.data.courses[0],{...legacyCourse,semesterId:null})
  const v2=readCourseStorage(memory(JSON.stringify({version:2,semester:{name:first.name,startDate:first.startDate,totalWeeks:first.totalWeeks},courses:[legacyCourse]})))
  assert.equal(v2.error,null);assert.equal(v2.data.version,5);assert.equal(v2.needsMigration,true);assert.deepEqual(v2.data.exams,[])
  assert.deepEqual(v2.data.courses[0],{...legacyCourse,semesterId:v2.data.semesters[0].id})
  const value=snapshot({exams:[exam({courseId:'c1',associationNote:'先前关联说明'})]})
  const store=memory(JSON.stringify(value));assert.deepEqual(readCourseStorage(store),{data:value,error:null})
  assert.equal(writeCourseStorage(value,store),null);assert.deepEqual(readCourseStorage(store).data,value)
})
test('independent exam storage strictly rejects missing fields, malformed metadata, membership and duplicate IDs',()=>{
  assert.ok(storage,'independent examStorage module is required')
  assert.deepEqual(storage.readExams([exam({courseId:'c1'})],[first,second],[course]),[exam({courseId:'c1'})])
  for(const changes of [{id:''},{id:2},{semesterId:null},{semesterId:'missing'},{courseId:undefined},{courseId:'missing'},{semesterId:'s1',courseId:'c1'},{title:2},{examType:'bad'},{examDate:'2027-02-29'},{startTime:3},{endTime:undefined},{startTime:'10:00',endTime:'09:00'},{location:null},{seat:2},{note:null},{createdAt:'invalid'},{updatedAt:'invalid'},{updatedAt:undefined},{associationNote:2}])assert.throws(()=>storage.readExams([exam(changes)],[first,second],[course]),JSON.stringify(changes))
  for(const value of [null,undefined,{},[null],[exam(),exam()]])assert.throws(()=>storage.readExams(value,[first,second],[course]))
})
test('any invalid v5 exam protects the whole raw snapshot without silently dropping a record',()=>{
  const good=exam(),invalid={...exam({id:'e2'}),examDate:'2027-02-29'}
  for(const exams of [[good,invalid],[good,good],undefined,null]){
    const raw=JSON.stringify(snapshot({exams}));const store=memory(raw);const result=readCourseStorage(store)
    assert.ok(result.error);assert.equal(store.value,raw);assert.deepEqual(result.data.exams,[])
  }
  const empty=readCourseStorage(memory(null));assert.deepEqual(empty,{data:{version:5,studyRecords:[],pomodoro:initialPomodoro(),semesters:[],courses:[],tasks:[],exams:[]},error:null})
})
test('course deletion retains all exams and tasks, clears only related course membership and explains source',()=>{
  const data=snapshot({tasks:[task({type:'assignment',semesterId:'s2',courseId:'c1'})],exams:[exam({courseId:'c1'}),exam({id:'unassociated'})]})
  const result=transactions.withoutCourse(data,'c1')
  assert.equal(result.exams.length,2);assert.equal(result.exams[0].courseId,null);assert.equal(result.exams[0].semesterId,'s2')
  assert.match(result.exams[0].associationNote,/高等数学.*已删除/)
  assert.deepEqual(result.exams[1],data.exams[1]);assert.equal(result.tasks[0].courseId,null);assert.equal(data.exams[0].courseId,'c1')
  assert.equal(result.tasks.length,1)
})
test('semester deletion keeps unrelated exam fields/course and requires migration only for affected exams',()=>{
  const otherCourse={...course,id:'oldcourse',semesterId:'s1'}
  const data=snapshot({courses:[course,otherCourse],exams:[exam({courseId:'c1'}),exam({id:'oldexam',semesterId:'s1',courseId:'oldcourse',examDate:'2026-12-01'})]})
  const result=transactions.withoutSemester(data,'s2','s1')
  assert.deepEqual(result.exams.find(x=>x.id==='oldexam'),data.exams.find(x=>x.id==='oldexam'))
  const empty=snapshot({exams:[]});const oldResult=transactions.withoutSemester(empty,'s2')
  assert.deepEqual(oldResult.exams,[]);assert.equal(oldResult.semesters.length,1)
})
test('storage reads fail safely and a quota failure leaves old shared snapshot untouched',()=>{
  assert.ok(readCourseStorage({getItem(){throw Error('denied')}}).error)
  const raw=JSON.stringify(snapshot());const store={value:raw,getItem(){return this.value},setItem(){throw Error('quota')}}
  const candidate=transactions.withoutSemester(snapshot(),'s2','s1')
  assert.match(writeCourseStorage(candidate,store),/保存失败/)
  assert.equal(store.value,raw)
  const malformed=memory('{broken');assert.ok(readCourseStorage(malformed).error);assert.equal(malformed.value,'{broken')
})
