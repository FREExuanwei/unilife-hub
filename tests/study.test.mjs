import test from 'node:test'
import assert from 'node:assert/strict'
import { validateStudy, aggregateStudy, distributeMinutes, formatDuration, filterStudies, manualStudyDraft, studyCourseSnapshot } from '../src/features/study/studyUtils.ts'
import { initialPomodoro, transitionPomodoro, remainingTime, elapsedTime } from '../src/features/pomodoro/pomodoroUtils.ts'
import { readCourseStorage, writeCourseStorage } from '../src/features/courses/courseStorage.ts'
import { withoutCourse, withoutSemester } from '../src/features/courses/hubTransactions.ts'

const sem={id:'s',name:'秋季',startDate:'2026-09-01',totalWeeks:20}
const course={id:'c',semesterId:'s',name:'数学',weekday:1,startTime:'08:00',endTime:'09:00',teacher:'',classroom:'',color:'blue',note:'',createdAt:'2026-09-01T00:00:00.000Z',weeks:[1],weekMode:'custom'}
const now=new Date(2026,9,8,18)
const record=(overrides={})=>({id:'r',semesterId:null,courseId:null,courseNameSnapshot:'',title:'复习',note:'',date:'2026-10-08',startTime:null,endTime:null,durationMinutes:90,source:'manual',createdAt:now.toISOString(),updatedAt:now.toISOString(),...overrides})
const data=(overrides={})=>({version:5,semesters:[sem,{...sem,id:'old',name:'春季',startDate:'2026-02-01',totalWeeks:18}],courses:[course],tasks:[],exams:[],studyRecords:[],pomodoro:initialPomodoro(),...overrides})
const memory=raw=>({raw,getItem(){return this.raw},setItem(_key,value){this.raw=value}})
test('course snapshots distinguish deliberate unlinking, deletion, renaming and reassociation',()=>{
 const linked=record({courseId:'c',courseNameSnapshot:'数学'})
 assert.equal(studyCourseSnapshot(linked,null,[course]),'')
 assert.equal(studyCourseSnapshot(linked,'c',[{...course,name:'新版数学'}]),'数学')
 assert.equal(studyCourseSnapshot(record({courseId:null,courseNameSnapshot:'数学'}),null,[]),'数学')
 assert.equal(studyCourseSnapshot(linked,'c2',[{...course,id:'c2',name:'英语'}]),'英语')
})
test('manual duration and range modes use integer minutes and validate times/local dates',()=>{
 const direct=manualStudyDraft({title:'阅读',note:'',date:'2026-10-08',mode:'duration',minutes:60,start:'',end:'',courseId:null},[sem],[course],now)
 assert.equal(direct.durationMinutes,60);assert.equal(direct.startTime,null);assert.equal(direct.semesterId,'s')
 const range=manualStudyDraft({title:'复习',note:'',date:'2026-10-08',mode:'range',minutes:0,start:'14:00',end:'15:30',courseId:'c'},[sem],[course],now)
 assert.equal(range.durationMinutes,90);assert.equal(range.courseNameSnapshot,'数学');assert.equal(range.semesterId,'s');assert.deepEqual(validateStudy(range,[sem],[course],now),{})
 for(const minutes of [0,-1,1441,1.2,NaN]) assert.ok(validateStudy(record({durationMinutes:minutes}),[sem],[course],now).durationMinutes)
 assert.ok(validateStudy(record({date:'2026-02-30'}),[sem],[course],now).date)
 assert.ok(validateStudy(record({date:'2026-10-09'}),[sem],[course],now).date)
 assert.throws(()=>manualStudyDraft({title:'x',note:'',date:'2026-10-08',mode:'range',minutes:0,start:'15:00',end:'14:00',courseId:null},[sem],[course],now))
 assert.ok(validateStudy(record({courseId:'c',semesterId:null}),[sem],[course],now).courseId)
 assert.equal(manualStudyDraft({title:'假期',note:'',date:'2026-07-30',mode:'duration',minutes:30,start:'',end:'',courseId:null},[],[],now).semesterId,null)
})
test('natural week/month stats, today-or-yesterday streak and course ID isolation',()=>{
 const courses=[course,{...course,id:'c2',semesterId:'old'}]
 const records=[record({id:'1',date:'2026-10-04',durationMinutes:30}),record({id:'2',date:'2026-10-05',durationMinutes:60,courseId:'c',semesterId:'s'}),record({id:'3',date:'2026-10-06',durationMinutes:15,courseId:'c2',semesterId:'old'}),record({id:'4',date:'2026-10-07',durationMinutes:45}),record({id:'5',date:'2026-09-30',durationMinutes:10})]
 const stats=aggregateStudy(records,courses,now,'week')
 assert.equal(stats.today,0);assert.equal(stats.week,120);assert.equal(stats.month,150);assert.equal(stats.streak,4);assert.equal(stats.longestStreak,4)
 assert.equal(stats.trend.length,7);assert.equal(stats.trend.find(d=>d.date==='2026-10-08').minutes,0)
 assert.equal(stats.courses.find(c=>c.id==='c').minutes,60);assert.equal(stats.courses.find(c=>c.id==='c2').minutes,15);assert.equal(stats.courses.find(c=>c.id===null).minutes,45)
 assert.equal(aggregateStudy(records,courses,new Date(2026,9,10,12),'month').streak,0)
 assert.equal(aggregateStudy(records,courses,now,'month').trend.length,31)
 assert.equal(formatDuration(135),'2小时15分钟');assert.equal(formatDuration(60),'1小时');assert.equal(formatDuration(0),'0分钟')
 assert.equal(filterStudies(records,courses,{range:'all',courseId:'c2',search:'数学'},now).length,1)
 assert.equal(filterStudies(records,courses,{range:'week',courseId:'all',search:''},now)[0].date,'2026-10-07')
})
test('cross-midnight active segments allocate integer minutes without counting pause',()=>{
 const a=new Date(2026,9,7,23,50).getTime(),b=new Date(2026,9,8,0,10).getTime()
 const r=record({date:'2026-10-07',source:'pomodoro',durationMinutes:20,startTime:new Date(a).toISOString(),endTime:new Date(b).toISOString(),segments:[{start:a,end:b}]})
 assert.deepEqual([...distributeMinutes(r)], [['2026-10-07',10],['2026-10-08',10]])
 assert.equal(aggregateStudy([r],[],now,'week').today,10)
 const paused=record({...r,durationMinutes:10,segments:[{start:a,end:a+5*60000},{start:b-5*60000,end:b}]})
 assert.deepEqual([...distributeMinutes(paused)],[['2026-10-07',5],['2026-10-08',5]])
})
test('timestamp timer pauses, restores, resumes and completes once; breaks produce no records',()=>{
 const t=new Date(2026,9,8,10).getTime()
 let p=initialPomodoro();assert.equal(p.settings.focusMinutes,25);assert.equal(p.settings.breakMinutes,5)
 p=transitionPomodoro(p,{type:'start',cycleId:'cycle',title:'数学',courseId:'c',semesterId:'s',courseNameSnapshot:'数学'},t).pomodoro
 assert.equal(remainingTime(p.state,t+60000),24*60000)
 p=transitionPomodoro(p,{type:'pause',cycleId:'cycle'},t+5*60000).pomodoro
 assert.equal(remainingTime(p.state,t+60*60000),20*60000);assert.equal(elapsedTime(p.state,t+60*60000),5*60000)
 p=transitionPomodoro(p,{type:'resume',cycleId:'cycle'},t+60*60000).pomodoro
 const done=transitionPomodoro(p,{type:'complete',cycleId:'cycle'},t+90*60000)
 assert.equal(done.record.durationMinutes,25);assert.equal(done.record.id,'pomodoro:cycle');assert.equal(done.record.pomodoroCompleted,true);assert.equal(done.pomodoro.state.mode,'break');assert.equal(done.pomodoro.state.status,'idle')
 assert.equal(transitionPomodoro(done.pomodoro,{type:'complete',cycleId:'cycle'},t+91*60000).record,undefined)
 let rest=transitionPomodoro(done.pomodoro,{type:'start',cycleId:'rest',title:'',courseId:null,semesterId:null,courseNameSnapshot:''},t+90*60000).pomodoro
 assert.equal(transitionPomodoro(rest,{type:'complete',cycleId:'rest'},t+96*60000).record,undefined)
 const early=transitionPomodoro(transitionPomodoro(initialPomodoro(),{type:'start',cycleId:'early',title:'x',courseId:null,semesterId:null,courseNameSnapshot:''},t).pomodoro,{type:'finish',cycleId:'early',save:true},t+18*60000+59000)
 assert.equal(early.record.durationMinutes,18);assert.equal(early.record.pomodoroCompleted,false)
 assert.equal(transitionPomodoro(initialPomodoro(),{type:'settings',settings:{focusMinutes:0,breakMinutes:5}},t).error!==null,true)
})
test('clock rollback cannot increase a resumed timer beyond its stored remainder or corrupt it',()=>{
 const t=new Date(2026,9,8,10).getTime()
 let p=transitionPomodoro(initialPomodoro(),{type:'start',cycleId:'rollback',title:'x',courseId:null,semesterId:null,courseNameSnapshot:''},t).pomodoro
 p=transitionPomodoro(p,{type:'pause',cycleId:'rollback'},t+5*60000).pomodoro
 p=transitionPomodoro(p,{type:'resume',cycleId:'rollback'},t+10*60000).pomodoro
 assert.equal(remainingTime(p.state,t+9*60000),20*60000)
 p=transitionPomodoro(p,{type:'pause',cycleId:'rollback'},t+9*60000).pomodoro
 assert.equal(p.state.segments.reduce((sum,s)=>sum+s.end-s.start,0)+p.state.remainingMs,p.state.plannedMs)
 const loaded=readCourseStorage(memory(JSON.stringify(data({pomodoro:p}))));assert.equal(loaded.error,null)
 p=transitionPomodoro(p,{type:'resume',cycleId:'rollback'},t+4*60000).pomodoro
 assert.equal(p.state.resumedAt,t+5*60000)
 assert.equal(readCourseStorage(memory(JSON.stringify(data({pomodoro:p})))).error,null)
})
test('long paused focus retains valid history while counting only active minutes',()=>{
 const t=new Date(2026,9,8,10).getTime()
 let p=transitionPomodoro(initialPomodoro(),{type:'start',cycleId:'long',title:'长期恢复',courseId:null,semesterId:null,courseNameSnapshot:''},t).pomodoro
 p=transitionPomodoro(p,{type:'pause',cycleId:'long'},t+5*60000).pomodoro
 const later=t+400*86400000
 p=transitionPomodoro(p,{type:'resume',cycleId:'long'},later).pomodoro
 const done=transitionPomodoro(p,{type:'complete',cycleId:'long'},later+21*60000)
 assert.equal(done.record.durationMinutes,25)
 assert.deepEqual(validateStudy(done.record,[],[],new Date(later+21*60000)),{})
 assert.equal(readCourseStorage(memory(JSON.stringify(data({studyRecords:[done.record],pomodoro:done.pomodoro})))).error,null)
})
test('versions 1–4 migrate safely to 5 without seeds; broken study/timer cannot overwrite raw data',()=>{
 const old=data();delete old.studyRecords;delete old.pomodoro;old.version=4
 const migrated=readCourseStorage(memory(JSON.stringify(old)));assert.equal(migrated.data.version,5);assert.deepEqual(migrated.data.studyRecords,[]);assert.equal(migrated.data.pomodoro.settings.focusMinutes,25);assert.equal(migrated.needsMigration,true);assert.equal(migrated.error,null)
 for(const change of [{studyRecords:[record({durationMinutes:-1})]},{studyRecords:[record(),record()]},{pomodoro:{version:99}},{studyRecords:[record({startTime:'garbage'})]}]){
  const raw=JSON.stringify(data(change)),store=memory(raw),loaded=readCourseStorage(store);assert.ok(loaded.error);assert.equal(store.raw,raw)
 }
 const raw=JSON.stringify(data()),store={getItem(){return raw},setItem(){throw Error('quota')}};assert.ok(writeCourseStorage(data({studyRecords:[record()]}),store));assert.equal(store.getItem(),raw)
})
test('course and semester deletion keep studies, snapshots and pending focus without dangling IDs',()=>{
 let snapshot=data({studyRecords:[record({courseId:'c',semesterId:'s',courseNameSnapshot:'数学'})]})
 snapshot.pomodoro=transitionPomodoro(snapshot.pomodoro,{type:'start',cycleId:'cycle',title:'x',courseId:'c',semesterId:'s',courseNameSnapshot:'数学'},now.getTime()).pomodoro
 const deleted=withoutCourse(snapshot,'c');assert.equal(deleted.studyRecords[0].courseId,null);assert.equal(deleted.studyRecords[0].courseNameSnapshot,'数学');assert.equal(deleted.pomodoro.state.courseId,null);assert.equal(deleted.studyRecords[0].durationMinutes,90)
 const semDeleted=withoutSemester(snapshot,'s');assert.equal(semDeleted.studyRecords[0].semesterId,null);assert.equal(semDeleted.studyRecords[0].courseId,null);assert.equal(semDeleted.pomodoro.state.semesterId,null);assert.equal(semDeleted.studyRecords.length,1)
})
