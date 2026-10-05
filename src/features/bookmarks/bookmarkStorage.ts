import type { Bookmark, BookmarkData, BookmarkLoadResult } from './bookmarkTypes.ts'
import { DEFAULT_CATEGORIES, normalizeUrl } from './bookmarkUtils.ts'
import { sameSnapshot, withHubLock } from '../courses/hubLock.ts'
import type { HubLock } from '../courses/hubLock.ts'
import { hasPendingRecovery } from '../backup/storageTransaction.ts'

export const BOOKMARK_STORAGE_KEY = 'unilife-bookmarks:v1'
export type BookmarkStorage = Pick<Storage, 'getItem' | 'setItem'>
export const MAX_BOOKMARKS = 1000
export const MAX_BOOKMARK_CATEGORIES = 100
const MAX_STORAGE_LENGTH = 8 * 1024 * 1024
const READ_ERROR = '无法读取收藏数据。请检查浏览器存储后刷新页面；现有数据不会被覆盖。'
const WRITE_ERROR = '保存失败，浏览器存储不可用或空间不足。请保留当前输入，检查后重试。'
const emptyData = (): BookmarkData => ({ version: 1, bookmarks: [], categories: [...DEFAULT_CATEGORIES] })

function sampleData(): BookmarkData {
  const createdAt = new Date().toISOString()
  const bookmarks: Bookmark[] = [
    { id: 'sample-chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', category: 'AI', note: '', isPinned: true, icon: 'auto', createdAt },
    { id: 'sample-github', name: 'GitHub', url: 'https://github.com/', category: '编程', note: '', isPinned: false, icon: 'auto', createdAt },
    { id: 'sample-youtube', name: 'YouTube', url: 'https://www.youtube.com/', category: '娱乐', note: '', isPinned: false, icon: 'auto', createdAt },
  ]
  return { version: 1, bookmarks, categories: [...DEFAULT_CATEGORIES] }
}

function text(value: unknown, max: number, allowEmpty = false, multiline = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())
    || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) throw new Error('Invalid bookmark text')
  return value
}

function categoryName(value: unknown): string {
  const category = text(value, 24).trim()
  if (category === '__all__' || category === '__new__') throw new Error('Reserved category')
  return category
}

/** Construct a bounded, known-field snapshot for loading, backup and persistence. */
export function parseBookmarkData(value: unknown): BookmarkData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid bookmark data')
  const data = value as Record<string, unknown>
  if (data.version !== 1 || !Array.isArray(data.bookmarks) || data.bookmarks.length > MAX_BOOKMARKS
    || !Array.isArray(data.categories) || data.categories.length > MAX_BOOKMARK_CATEGORIES) throw new Error('Invalid bookmark lists')
  const bookmarks: Bookmark[] = data.bookmarks.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid bookmark')
    const item = raw as Record<string, unknown>
    const createdAt = text(item.createdAt, 40)
    if (typeof item.isPinned !== 'boolean'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt)
      || !Number.isFinite(Date.parse(createdAt))) throw new Error('Invalid bookmark fields')
    const icon = text(item.icon, 2048)
    return {
      id: text(item.id, 128), name: text(item.name, 80).trim(), url: normalizeUrl(text(item.url, 2048)),
      category: categoryName(item.category), note: text(item.note, 500, true, true), isPinned: item.isPinned,
      icon: icon === 'auto' || icon === 'default' ? icon : normalizeUrl(icon), createdAt,
    }
  })
  if (new Set(bookmarks.map((item) => item.id)).size !== bookmarks.length) throw new Error('Duplicate bookmark IDs')
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...data.categories.map(categoryName), ...bookmarks.map((item) => item.category)])]
  if (categories.length > MAX_BOOKMARK_CATEGORIES) throw new Error('Too many bookmark categories')
  return { version: 1, bookmarks, categories }
}

export function readBookmarkStorage(storage?: Pick<Storage, 'getItem'>): BookmarkLoadResult {
  try {
    const raw = (storage ?? window.localStorage).getItem(BOOKMARK_STORAGE_KEY)
    if (raw === null) return { data: sampleData(), error: null, needsInitialization: true }
    if (raw.length > MAX_STORAGE_LENGTH) throw new Error('Bookmark storage too large')
    return { data: parseBookmarkData(JSON.parse(raw)), error: null, needsInitialization: false }
  } catch {
    return { data: emptyData(), error: READ_ERROR, needsInitialization: false }
  }
}

export function writeBookmarkStorage(data: BookmarkData, storage?: BookmarkStorage): string | null {
  let safe: BookmarkData
  try { safe = parseBookmarkData(data) }
  catch { return '收藏数据格式无效或超出数量、长度限制，未保存。' }
  try {
    const target = storage ?? window.localStorage
    if (hasPendingRecovery(target)) return '上次数据操作需要安全恢复，收藏暂时无法保存。请检查浏览器存储后重新加载。'
    target.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(safe))
    return null
  } catch { return WRITE_ERROR }
}

export async function initializeBookmarkStorage(storage?: BookmarkStorage, locks?: HubLock): Promise<BookmarkLoadResult> {
  try {
    return await withHubLock(() => {
      const loaded = readBookmarkStorage(storage)
      if (!loaded.needsInitialization || loaded.error) return loaded
      const error = writeBookmarkStorage(loaded.data, storage)
      return { ...loaded, error, needsInitialization: Boolean(error) }
    }, locks)
  } catch { return { data: emptyData(), error: WRITE_ERROR, needsInitialization: false } }
}

/** Reject stale UI drafts after any queued cross-tab write or full restore. */
export async function commitBookmarkStorage(base: BookmarkData, next: BookmarkData, storage?: BookmarkStorage, locks?: HubLock): Promise<BookmarkLoadResult> {
  try {
    return await withHubLock(() => {
      const loaded = readBookmarkStorage(storage)
      if (loaded.error) return loaded
      if (loaded.needsInitialization) return { data: emptyData(), error: '收藏数据已在其他页面被清除，请重新操作。', needsInitialization: false }
      if (!sameSnapshot(loaded.data, parseBookmarkData(base))) return { ...loaded, error: '收藏数据已在其他页面更新，请检查最新内容后重试。' }
      const error = writeBookmarkStorage(next, storage)
      return error ? { ...loaded, error } : { data: parseBookmarkData(next), error: null, needsInitialization: false }
    }, locks)
  } catch { return { data: base, error: WRITE_ERROR, needsInitialization: false } }
}
