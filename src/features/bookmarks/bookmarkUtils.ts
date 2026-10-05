import type { Bookmark, BookmarkSort } from './bookmarkTypes.ts'

export const DEFAULT_CATEGORIES = ['AI', '学习', '编程', '学校', '娱乐', '工具', '其他']

export function normalizeUrl(input: string): string {
  if (typeof input !== 'string' || /[\\\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(input)) throw new Error('网址不能包含控制字符或反斜杠。')
  const value = input.trim()
  if (!value || value.length > 2048 || /\s/.test(value)) throw new Error('请输入有效的网址，例如 chatgpt.com。')
  const withProtocol = /^https?:\/\//i.test(value)
  const hostWithPort = /^[^/:]+:\d+(?:\/|$)/.test(value)
  if (!withProtocol && /^[a-z][a-z\d+.-]*:/i.test(value) && !hostWithPort) {
    throw new Error('网址只支持 http:// 或 https://。')
  }
  let url: URL
  try { url = new URL(withProtocol ? value : `https:${value.startsWith('//') ? '' : '//'}${value}`) }
  catch { throw new Error('网址格式不正确，请检查域名和端口。') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('请输入不含账号密码的 HTTP(S) 网址。')
  if (!url.hostname.includes('.') && url.hostname !== 'localhost' && !url.hostname.startsWith('[')) {
    throw new Error('请输入完整域名，例如 example.com。')
  }
  if (url.href.length > 2048) throw new Error('网址过长，请缩短至 2048 个字符以内。')
  return url.href
}

export function getDomain(url: string): string {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return url }
}

export function iconUrl(bookmark: Pick<Bookmark, 'url' | 'icon'>): string {
  if (bookmark.icon === 'default') return ''
  try {
    if (bookmark.icon === 'auto') return new URL('/favicon.ico', normalizeUrl(bookmark.url)).href
    return normalizeUrl(bookmark.icon)
  } catch { return '' }
}

export function sortBookmarks(items: Bookmark[], sort: BookmarkSort = 'newest'): Bookmark[] {
  return [...items].sort((a, b) => {
    const pinned = Number(b.isPinned) - Number(a.isPinned)
    if (pinned) return pinned
    return sort === 'name'
      ? a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' })
      : Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

export function filterBookmarks(items: Bookmark[], query: string, category: string): Bookmark[] {
  const search = query.trim().toLocaleLowerCase()
  return items.filter((item) => (category === '__all__' || item.category === category)
    && [item.name, item.url, item.category, item.note].some((value) => value.toLocaleLowerCase().includes(search)))
}

export function categoryTone(category: string): string {
  const tones: Record<string, string> = { AI: 'purple', 学习: 'blue', 编程: 'cyan', 学校: 'blue', 娱乐: 'pink', 工具: 'orange', 其他: 'neutral' }
  if (Object.hasOwn(tones, category)) return tones[category]
  const available = ['blue', 'purple', 'pink', 'cyan', 'orange']
  const hash = [...category].reduce((total, char) => total + char.codePointAt(0)!, 0)
  return available[hash % available.length]
}
