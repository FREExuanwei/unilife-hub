import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BookmarkContext } from './BookmarkContext'
import type { Bookmark, BookmarkData, BookmarkDraft } from './bookmarkTypes'
import { BOOKMARK_STORAGE_KEY, commitBookmarkStorage, initializeBookmarkStorage, MAX_BOOKMARKS, MAX_BOOKMARK_CATEGORIES, readBookmarkStorage } from './bookmarkStorage'
import { normalizeUrl } from './bookmarkUtils'
import { sameSnapshot } from '../courses/hubLock'

export default function BookmarkProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readBookmarkStorage)
  const [data, setData] = useState(initial.data)
  const [storageError, setStorageError] = useState(initial.error)
  const latestData = useRef(data)

  useEffect(() => {
    let active = true
    const sync = () => {
      const loaded = readBookmarkStorage()
      // An explicit removal in another tab should not regenerate the samples.
      const next = loaded.needsInitialization ? { ...loaded.data, bookmarks: [] } : loaded.data
      latestData.current = next
      setData(next)
      setStorageError(loaded.error)
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === BOOKMARK_STORAGE_KEY || event.key === null) sync()
    }
    if (initial.needsInitialization) {
      void initializeBookmarkStorage().then((loaded) => {
        if (!active) return
        if (loaded.error) setStorageError(loaded.error)
        else sync()
      })
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('unilife:data-restored', sync)
    return () => {
      active = false
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('unilife:data-restored', sync)
    }
  }, [initial])

  async function commit(base: BookmarkData, next: BookmarkData): Promise<string | null> {
    const result = await commitBookmarkStorage(base, next)
    const loaded = readBookmarkStorage()
    const current = loaded.needsInitialization ? { ...loaded.data, bookmarks: [] } : loaded.data
    latestData.current = current
    setData(current)
    setStorageError(result.error ?? loaded.error)
    return result.error ?? loaded.error
  }

  async function saveBookmark(draft: BookmarkDraft, id?: string, expected?: Bookmark): Promise<string | null> {
    const current = latestData.current
    if (id && !current.bookmarks.some((item) => item.id === id)) return '这个网站已被删除，请关闭表单后重试。'
    if (id && expected && !sameSnapshot(current.bookmarks.find((item) => item.id === id), expected)) return '这个网站已被更新，请保留当前输入，检查最新内容后重试。'
    try {
      const name = draft.name.trim()
      const rawCategory = draft.category.trim()
      if (!name || name.length > 80) return '网站名称需要 1～80 个字符。'
      if (!rawCategory || rawCategory.length > 24 || rawCategory === '__all__' || rawCategory === '__new__') return '请输入有效的分类名称（1～24 个字符）。'
      if (draft.note.length > 500) return '备注最多 500 个字符。'
      if (!id && current.bookmarks.length >= MAX_BOOKMARKS) return `最多保存 ${MAX_BOOKMARKS} 个网站，请先整理现有收藏。`
      const category = current.categories.find((item) => item.toLocaleLowerCase() === rawCategory.toLocaleLowerCase()) ?? rawCategory
      if (!current.categories.includes(category) && current.categories.length >= MAX_BOOKMARK_CATEGORIES) return `最多保存 ${MAX_BOOKMARK_CATEGORIES} 个分类，请选择已有分类。`
      const values = { name, category, url: normalizeUrl(draft.url), note: draft.note.trim(), isPinned: draft.isPinned, icon: ['auto', 'default'].includes(draft.icon) ? draft.icon : normalizeUrl(draft.icon) }
      const bookmarks = id
        ? current.bookmarks.map((item) => item.id === id ? { ...item, ...values } : item)
        : [...current.bookmarks, { ...values, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]
      return await commit(current, { version: 1, bookmarks, categories: [...new Set([...current.categories, category])] })
    } catch (error) { return error instanceof Error ? error.message : '无法保存，请检查输入。' }
  }

  async function deleteBookmark(id: string, expected?: Bookmark): Promise<string | null> {
    const current = latestData.current
    if (!current.bookmarks.some((item) => item.id === id)) return '这个网站已被删除，请检查最新内容。'
    if (expected && !sameSnapshot(current.bookmarks.find((item) => item.id === id), expected)) return '这个网站已被更新，请关闭确认窗口后重新检查。'
    return commit(current, { ...current, bookmarks: current.bookmarks.filter((item) => item.id !== id) })
  }

  async function togglePin(id: string): Promise<string | null> {
    const current = latestData.current
    if (!current.bookmarks.some((item) => item.id === id)) return '这个网站已被删除，请检查最新内容。'
    return commit(current, { ...current, bookmarks: current.bookmarks.map((item) => item.id === id ? { ...item, isPinned: !item.isPinned } : item) })
  }

  return <BookmarkContext.Provider value={{ data, storageError, saveBookmark, deleteBookmark, togglePin }}>{children}</BookmarkContext.Provider>
}
