import test from 'node:test'
import assert from 'node:assert/strict'
import { unchangedRecord } from '../src/features/courses/editGuard.ts'
test('old edit drafts reject restored or deleted records even with the same ID',()=>{
 for(const original of [{id:'s',name:'学期'},{id:'c',name:'课程',weeks:[1,2]},{id:'t',title:'任务',status:'pending'},{id:'e',title:'考试'},{id:'r',title:'学习',durationMinutes:25}]){
  assert.equal(unchangedRecord(original,{...original}),null)
  assert.ok(unchangedRecord(original,{...original,note:'restored'}))
  assert.ok(unchangedRecord(original,undefined))
 }
 assert.equal(unchangedRecord(undefined,undefined),null)
})
