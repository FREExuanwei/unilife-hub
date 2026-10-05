import { createContext } from 'react'
import type { Bookmark, BookmarkData, BookmarkDraft } from './bookmarkTypes'

interface BookmarkContextValue {
  data: BookmarkData
  storageError: string | null
  saveBookmark: (draft: BookmarkDraft, id?: string, expected?: Bookmark) => Promise<string | null>
  deleteBookmark: (id: string, expected?: Bookmark) => Promise<string | null>
  togglePin: (id: string) => Promise<string | null>
}

export const BookmarkContext = createContext<BookmarkContextValue | null>(null)
