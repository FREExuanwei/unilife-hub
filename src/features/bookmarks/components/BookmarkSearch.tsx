import { Search, X } from 'lucide-react'

export default function BookmarkSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="bookmark-search"><Search size={19} aria-hidden="true" /><input type="search" value={value} onChange={(event) => onChange(event.target.value)} aria-label="搜索网站" placeholder="搜索名称、网址、分类或备注…" />{value && <button type="button" className="icon-button" aria-label="清空搜索" onClick={() => onChange('')}><X size={17} aria-hidden="true" /></button>}</div>
}
