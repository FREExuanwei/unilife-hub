import { Link } from 'react-router'
import { ArrowRight, Bookmark, Plus, ExternalLink, Pin } from 'lucide-react'
import { useBookmarks } from '../useBookmarks'
import { categoryTone, getDomain, sortBookmarks } from '../bookmarkUtils'
import BookmarkIcon from './BookmarkIcon'

export default function DashboardBookmarks() {
  const { data, storageError } = useBookmarks()
  const recent = sortBookmarks(data.bookmarks).slice(0, 4)
  return (
    <section className="dashboard-bookmarks" aria-labelledby="saved-websites-title">
      <div className="section-heading"><h2 id="saved-websites-title">我的收藏网站</h2><Link to="/bookmarks" className="section-link">查看全部<ArrowRight size={14} aria-hidden="true" /></Link></div>
      {storageError && <p className="storage-notice" role="alert">{storageError}</p>}
      {recent.length ? <div className="dashboard-bookmark-grid">{recent.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className={`dashboard-bookmark tone-${categoryTone(item.category)}`} aria-label={`打开 ${item.name}（新标签页）`}><BookmarkIcon bookmark={item} /><span className="dashboard-bookmark-copy"><strong>{item.name}</strong><small>{getDomain(item.url)}</small></span>{item.isPinned ? <Pin size={15} aria-label="已置顶" /> : <ExternalLink size={15} aria-hidden="true" />}</a>)}</div>
        : <div className="dashboard-bookmark-empty"><Bookmark size={26} aria-hidden="true" /><div><strong>还没有收藏网站</strong><p>把喜欢的网站，放进自己的小小收藏夹。</p></div><Link to="/bookmarks?add=1" className="secondary-button"><Plus size={16} aria-hidden="true" />添加第一个网站</Link></div>}
    </section>
  )
}
