export interface HubLock { request<T>(name:string,work:()=>T|PromiseLike<T>):Promise<T> }
let localQueue: Promise<unknown> = Promise.resolve()
export function withHubLock<T>(work:()=>T|PromiseLike<T>,locks?:HubLock):Promise<T>{
  const manager=locks??(typeof navigator!=='undefined'?navigator.locks:undefined)
  if (manager) return manager.request('unilife-hub:write',work)
  const result = localQueue.then(work)
  localQueue = result.catch(() => undefined)
  return result
}
function canonical(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonical)
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]))
  return value
}
export function sameSnapshot(a:unknown,b:unknown):boolean{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}
