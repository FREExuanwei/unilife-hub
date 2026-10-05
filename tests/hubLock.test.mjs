import test from 'node:test'
import assert from 'node:assert/strict'
import { sameSnapshot, withHubLock } from '../src/features/courses/hubLock.ts'
test('snapshot equality ignores object key order without ignoring data or array changes',()=>{
 assert.equal(sameSnapshot({semesters:[{id:'s',name:'新学期',totalWeeks:20}]},{semesters:[{totalWeeks:20,name:'新学期',id:'s'}]}),true)
 assert.equal(sameSnapshot({a:[1,2]},{a:[2,1]}),false)
 assert.equal(sameSnapshot({a:undefined,b:null},{b:null}),true)
})
test('all hub writers serialize under the same lock so deletion cannot overwrite timer completion',async()=>{
 let tail=Promise.resolve(),inside=0,names=[],stored={studies:[],courses:['c']}
 const lock={request(name,fn){names.push(name);const result=tail.then(async()=>{inside++;assert.equal(inside,1);try{return await fn()}finally{inside--}});tail=result.catch(()=>{});return result}}
 let unblock;const gate=new Promise(resolve=>{unblock=resolve})
 const timer=withHubLock(async()=>{await gate;stored={...stored,studies:['cycle']}},lock)
 const deletion=withHubLock(()=>{stored={...stored,courses:[]}},lock)
 unblock();await Promise.all([timer,deletion]);assert.deepEqual(stored,{studies:['cycle'],courses:[]});assert.deepEqual(names,['unilife-hub:write','unilife-hub:write'])
})
