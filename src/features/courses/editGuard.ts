import { sameSnapshot } from './hubLock.ts'
export function unchangedRecord(original: unknown, current: unknown): string | null {
  return original !== undefined && !sameSnapshot(original, current)
    ? '此数据已在另一页面修改或恢复，请关闭表单并重新打开；当前输入不会覆盖新数据。' : null
}
