import { useState } from 'react'
import { Globe2 } from 'lucide-react'
import { iconUrl } from '../bookmarkUtils'
import type { Bookmark } from '../bookmarkTypes'

export default function BookmarkIcon({ bookmark }: { bookmark: Pick<Bookmark, 'url' | 'icon'> }) {
  const source = iconUrl(bookmark)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  return (
    <span className="bookmark-icon" aria-hidden="true">
      {source && failedSource !== source
        ? <img src={source} alt="" width="36" height="36" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(source)} />
        : <Globe2 size={28} strokeWidth={1.7} />}
    </span>
  )
}
