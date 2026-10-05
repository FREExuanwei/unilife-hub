import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Bookmark as BookmarkSymbol, Plus, SearchX, Trash2 } from 'lucide-react'
import type { Bookmark, BookmarkSort } from '../features/bookmarks/bookmarkTypes'
import { useBookmarks } from '../features/bookmarks/useBookmarks'
import { filterBookmarks, sortBookmarks } from '../features/bookmarks/bookmarkUtils'
import BookmarkCard from '../features/bookmarks/components/BookmarkCard'
import BookmarkModal from '../features/bookmarks/components/BookmarkModal'
import BookmarkForm from '../features/bookmarks/components/BookmarkForm'
import CategoryFilter from '../features/bookmarks/components/CategoryFilter'
import BookmarkSearch from '../features/bookmarks/components/BookmarkSearch'

export default function BookmarksPage() {
  const { data, storageError, saveBookmark, deleteBookmark, togglePin } = useBookmarks()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('__all__')
  const [sort, setSort] = useState<BookmarkSort>('newest')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bookmark | undefined>()
  const [deleting, setDeleting] = useState<Bookmark | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const visible = sortBookmarks(filterBookmarks(data.bookmarks, query, category), sort)
  const pinnedCount = data.bookmarks.filter((item) => item.isPinned).length
  const counts = data.bookmarks.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + 1
    return result
  }, Object.create(null) as Record<string, number>)

  function closeForm() {
    setFormOpen(false)
    setEditing(undefined)
    if (params.has('add')) { const next = new URLSearchParams(params); next.delete('add'); setParams(next, { replace: true }) }
  }

  function addWebsite() { setEditing(undefined); setFormOpen(true) }
  function editWebsite(bookmark: Bookmark) { setEditing(bookmark); setFormOpen(true) }
  async function pinWebsite(bookmark: Bookmark) {
    const error = await togglePin(bookmark.id)
    setOperationError(error)
    if (!error) setFeedback(`${bookmark.name} 已${bookmark.isPinned ? '取消置顶' : '置顶'}`)
  }
  async function confirmDelete() {
    if (!deleting) return
    const error = await deleteBookmark(deleting.id, deleting)
    setOperationError(error)
    if (!error) { setFeedback(`已删除 ${deleting.name}`); setDeleting(null) }
  }

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-heading">
        <div><p className="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</p><h1>网站收藏 <span className="page-title-icon"><BookmarkSymbol size={23} aria-hidden="true" /></span></h1><p>整理你的常用网站，一键快速访问。</p></div>
        <button type="button" className="primary-button" onClick={addWebsite}><Plus size={18} aria-hidden="true" />添加网站</button>
      </div>
      <div className="bookmarks-toolbar"><BookmarkSearch value={query} onChange={setQuery} /><label className="bookmark-sort">排序<select aria-label="网站排序" value={sort} onChange={(event) => setSort(event.target.value as BookmarkSort)}><option value="newest">按添加时间</option><option value="name">按名称</option></select></label></div>
      <CategoryFilter categories={data.categories} selected={category} onChange={setCategory} counts={counts} total={data.bookmarks.length} />
      <div className="bookmarks-summary"><span>共 {data.bookmarks.length} 个网站<span className="summary-divider">/</span>{pinnedCount} 个置顶</span><span>找到 {visible.length} 个网站</span></div>
      {(storageError || operationError) && <p className="storage-notice" role="alert">{operationError ?? storageError}</p>}
      <p className="bookmark-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
      {visible.length > 0
        ? <div className="bookmarks-grid">{visible.map((item) => <BookmarkCard key={item.id} bookmark={item} onEdit={editWebsite} onDelete={(bookmark) => { setOperationError(null); setDeleting(bookmark) }} onTogglePin={pinWebsite} />)}</div>
        : <section className="bookmarks-empty">
          <span className="empty-bookmark-icon">{data.bookmarks.length ? <SearchX size={34} aria-hidden="true" /> : <BookmarkSymbol size={34} aria-hidden="true" />}</span>
          <h2>{data.bookmarks.length ? '没有找到匹配的网站' : '还没有收藏网站'}</h2>
          <p>{data.bookmarks.length ? '试试其他关键词，或切换分类。' : '从第一个网站开始，让好用的工具触手可及。'}</p>
          {data.bookmarks.length ? <button type="button" className="secondary-button" onClick={() => { setQuery(''); setCategory('__all__') }}>清除筛选</button> : <button type="button" className="primary-button" onClick={addWebsite}><Plus size={17} aria-hidden="true" />添加第一个网站</button>}
        </section>}
      <p className="bookmarks-footnote">你的收藏保存在当前浏览器中 · 点击网站会在新标签页打开</p>
      {(formOpen || params.get('add') === '1') && <BookmarkModal title={editing ? '编辑网站' : '添加网站'} subtitle="给常用网站一个专属位置。" onClose={closeForm}>
        <BookmarkForm bookmark={editing} categories={data.categories} onCancel={closeForm} onSave={async (draft) => {
          const error = await saveBookmark(draft, editing?.id, editing)
          if (!error) { setFeedback(editing ? `已更新 ${draft.name.trim()}` : `已添加 ${draft.name.trim()}`); setOperationError(null); closeForm() }
          return error
        }} />
      </BookmarkModal>}
      {deleting && <BookmarkModal title="删除网站" compact onClose={() => setDeleting(null)}>
        <div className="delete-confirmation"><span className="delete-confirmation-icon"><Trash2 size={26} aria-hidden="true" /></span><h3>确定删除 {deleting.name} 吗？</h3><p>删除后，这个网站会从你的收藏夹中移除。</p>{operationError && <p className="field-error" role="alert">{operationError}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setDeleting(null)} autoFocus>取消</button><button type="button" className="danger-button" onClick={confirmDelete}>确认删除</button></div></div>
      </BookmarkModal>}
    </div>
  )
}
