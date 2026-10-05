import test from 'node:test'
import assert from 'node:assert/strict'
import { applyStorageTransaction, recoverStorageTransaction, RECOVERY_KEY, OWNED_KEYS } from '../src/features/backup/storageTransaction.ts'

const memory=(initial={},failOn=0)=>{const map=new Map(Object.entries(initial));let writes=0;return {map,getItem:k=>map.get(k)??null,setItem(k,v){if(++writes===failOn)throw Error('quota');map.set(k,v)},removeItem:k=>map.delete(k)}}
const replacement=()=>Object.fromEntries(OWNED_KEYS.map((k,i)=>[k,`new-${i}`]))

test('multi-key restore commits only owned keys and leaves unrelated data',()=>{
 const s=memory({unrelated:'keep'});assert.equal(applyStorageTransaction(replacement(),s),null)
 for(const k of OWNED_KEYS)assert.equal(s.getItem(k),replacement()[k])
 assert.equal(s.getItem('unrelated'),'keep');assert.equal(s.getItem(RECOVERY_KEY),null)
})
test('every partial import failure rolls back exact raw prior values',()=>{
 for(let fail=1;fail<=OWNED_KEYS.length+2;fail++){
  const before={unrelated:'keep',[OWNED_KEYS[0]]:'old raw',[OWNED_KEYS[2]]:'dark'},s=memory(before,fail)
  assert.ok(applyStorageTransaction(replacement(),s));assert.deepEqual(Object.fromEntries(s.map),before)
 }
})
test('interrupted prepared transaction recovers before application reads',()=>{
 const before=Object.fromEntries(OWNED_KEYS.map(k=>[k,k===OWNED_KEYS[0]?'old':null]))
 const s=memory({...replacement(),[RECOVERY_KEY]:JSON.stringify({version:1,phase:'prepared',before})})
 assert.equal(recoverStorageTransaction(s),null);assert.equal(s.getItem(OWNED_KEYS[0]),'old')
 for(const k of OWNED_KEYS.slice(1))assert.equal(s.getItem(k),null)
})
test('committed transaction keeps restored values across crash before journal cleanup',()=>{
 const s=memory({...replacement(),[RECOVERY_KEY]:JSON.stringify({version:1,phase:'committed',before:Object.fromEntries(OWNED_KEYS.map(k=>[k,null]))})})
 assert.equal(recoverStorageTransaction(s),null);assert.equal(s.getItem(OWNED_KEYS[0]),replacement()[OWNED_KEYS[0]])
})
test('untrusted recovery journal never writes unknown keys or malformed values',()=>{
 for(const before of [{foreign:'stolen'},{...Object.fromEntries(OWNED_KEYS.map(k=>[k,null])),foreign:'stolen'},Object.fromEntries(OWNED_KEYS.map(k=>[k,42]))]){
  const s=memory({foreign:'safe',[RECOVERY_KEY]:JSON.stringify({version:1,phase:'prepared',before})})
  assert.ok(recoverStorageTransaction(s));assert.equal(s.getItem('foreign'),'safe');assert.ok(s.getItem(RECOVERY_KEY))
 }
})
test('persistent quota while preparing journal never modifies data or claims a saved recovery copy',()=>{
 const s=memory({[OWNED_KEYS[0]]:'old'});s.setItem=()=>{throw Error('quota')}
 const error=applyStorageTransaction(replacement(),s)
 assert.ok(error);assert.equal(s.getItem(OWNED_KEYS[0]),'old');assert.equal(s.getItem(RECOVERY_KEY),null);assert.doesNotMatch(error,/保护副本仍保留/)
})
test('real capacity failure rolls back by shrinking keys before expanding old values',()=>{
 const initial={[OWNED_KEYS[0]]:'o'.repeat(1000),[OWNED_KEYS[1]]:'{}',[OWNED_KEYS[2]]:'dark'},s=memory(initial)
 const journal=JSON.stringify({version:1,phase:'prepared',before:Object.fromEntries(OWNED_KEYS.map(k=>[k,s.getItem(k)]))}),capacity=journal.length+1150
 const originalSet=s.setItem.bind(s);s.setItem=(k,v)=>{const projected=new Map(s.map);projected.set(k,v);if([...projected.values()].reduce((sum,x)=>sum+x.length,0)>capacity)throw Error('quota');originalSet(k,v)}
 const next=replacement();next[OWNED_KEYS[0]]='{}';next[OWNED_KEYS[1]]='b'.repeat(1100);next[OWNED_KEYS[2]]='x'.repeat(300)
 assert.ok(applyStorageTransaction(next,s));assert.deepEqual(Object.fromEntries(s.map),initial)
})
