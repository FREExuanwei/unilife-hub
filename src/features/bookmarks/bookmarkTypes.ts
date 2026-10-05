export interface Bookmark {
  id: string
  name: string
  url: string
  category: string
  note: string
  isPinned: boolean
  /** 'auto', 'default', or an HTTP(S) image URL. */
  icon: string
  createdAt: string
}

export type BookmarkDraft = Omit<Bookmark, 'id' | 'createdAt'>
export type BookmarkSort = 'newest' | 'name'

export interface BookmarkData {
  version: 1
  bookmarks: Bookmark[]
  categories: string[]
}

export interface BookmarkLoadResult {
  data: BookmarkData
  error: string | null
  needsInitialization: boolean
}
