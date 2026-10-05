import { ExternalLink, Pin, Pencil, Trash2 } from 'lucide-react'
import type { Bookmark } from '../bookmarkTypes'
import { categoryTone, getDomain } from '../bookmarkUtils'
import BookmarkIcon from './BookmarkIcon'

interface BookmarkCardProps {
  bookmark: Bookmark
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmark: Bookmark) => void
  onTogglePin: (bookmark: Bookmark) => void
}

export default function BookmarkCard({ bookmark, onEdit, onDelete, onTogglePin }: BookmarkCardProps) {
  return (
    <article className={`bookmark-card tone-${categoryTone(bookmark.category)}${bookmark.isPinned ? ' is-pinned' : ''}`}>
      <a className="bookmark-open" href={bookmark.url} target="_blank" rel="noopener noreferrer" aria-label={`打开 ${bookmark.name}（新标签页）`}>
        <div className="bookmark-card-top"><BookmarkIcon bookmark={bookmark} />{bookmark.isPinned && <span className="pinned-label"><Pin size={12} aria-hidden="true" />已置顶</span>}</div>
        <h3>{bookmark.name}</h3>
        <p className="bookmark-domain" title={bookmark.url}>{getDomain(bookmark.url)}</p>
        <span className="category-badge">{bookmark.category}</span>
        {bookmark.note && <p className="bookmark-note" title={bookmark.note}>{bookmark.note}</p>}
        <span className="open-website">打开网站<ExternalLink size={14} aria-hidden="true" /></span>
      </a>
      <div className="bookmark-card-actions">
        <button type="button" aria-label={`${bookmark.isPinned ? '取消置顶' : '置顶'} ${bookmark.name}`} aria-pressed={bookmark.isPinned} className={bookmark.isPinned ? 'pin-active' : ''} onClick={() => onTogglePin(bookmark)}><Pin size={16} aria-hidden="true" /><span>{bookmark.isPinned ? '取消置顶' : '置顶'}</span></button>
        <button type="button" aria-label={`编辑 ${bookmark.name}`} onClick={() => onEdit(bookmark)}><Pencil size={16} aria-hidden="true" /><span>编辑</span></button>
        <button type="button" className="delete-action" aria-label={`删除 ${bookmark.name}`} onClick={() => onDelete(bookmark)}><Trash2 size={16} aria-hidden="true" /><span>删除</span></button>
      </div>
    </article>
  )
}
