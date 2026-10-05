import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUrl, filterBookmarks, sortBookmarks, iconUrl, categoryTone } from '../src/features/bookmarks/bookmarkUtils.ts'
import { readBookmarkStorage, writeBookmarkStorage, BOOKMARK_STORAGE_KEY } from '../src/features/bookmarks/bookmarkStorage.ts'
import * as bookmarkStorage from '../src/features/bookmarks/bookmarkStorage.ts'

const example = (id, changes = {}) => ({ id, name: id, url: `https://${id}.example/`, category: '学习', note: '', isPinned: false, icon: 'auto', createdAt: '2026-10-03T00:00:00.000Z', ...changes })
function memoryStorage(initial = null) {
  let value = initial
  return { getItem: key => key === BOOKMARK_STORAGE_KEY ? value : null, setItem: (key, next) => { assert.equal(key, BOOKMARK_STORAGE_KEY); value = next } }
}

test('normalizes bare domains, paths, HTTP, protocol-relative URLs and ports', () => {
  assert.equal(normalizeUrl(' chatgpt.com '), 'https://chatgpt.com/')
  assert.equal(normalizeUrl('github.com/explore?q=react#topics'), 'https://github.com/explore?q=react#topics')
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com/')
  assert.equal(normalizeUrl('//example.com/path'), 'https://example.com/path')
  assert.equal(normalizeUrl('localhost:3000'), 'https://localhost:3000/')
  assert.equal(normalizeUrl('example.com:8080/path'), 'https://example.com:8080/path')
})
test('rejects executable protocols, credentials, invalid hosts and whitespace', () => {
  for (const input of ['', 'javascript:alert(1)', 'data:text/html,x', 'ftp://example.com', 'https://user:pass@example.com', 'not a url', 'invalid', 'https://', 'https://exa mple.com', 'http:example.com']) {
    assert.throws(() => normalizeUrl(input), Error, input)
  }
})
test('handles international domain names without losing the destination', () => {
  assert.match(normalizeUrl('例子.中国'), /^https:\/\/xn--/)
})
test('pinned bookmarks stay first in both name and newest sorting', () => {
  const items = [example('z', { isPinned: true }), example('b'), example('a', { createdAt: '2026-10-04T00:00:00Z' })]
  assert.deepEqual(sortBookmarks(items, 'name').map(x => x.id), ['z', 'a', 'b'])
  assert.deepEqual(sortBookmarks(items, 'newest').map(x => x.id), ['z', 'a', 'b'])
  assert.deepEqual(items.map(x => x.id), ['z', 'b', 'a'])
})
test('search matches name, URL, category and note, combined with category filter', () => {
  const items = [example('github', { name: 'GitHub', category: '编程', note: '项目代码' }), example('chatgpt', { category: 'AI' })]
  for (const term of ['GITHUB', 'github.example', '编程', '项目']) assert.equal(filterBookmarks(items, term, '__all__')[0].id, 'github')
  assert.equal(filterBookmarks(items, 'github', 'AI').length, 0)
  assert.equal(filterBookmarks(items, '', 'AI').length, 1)
})
test('automatic favicon uses website origin; default icon has no network URL', () => {
  assert.equal(iconUrl(example('site', { url: 'https://example.com/path' })), 'https://example.com/favicon.ico')
  assert.equal(iconUrl(example('site', { icon: 'default' })), '')
  assert.equal(iconUrl(example('site', { icon: 'https://images.example/icon.png' })), 'https://images.example/icon.png')
})
test('first use offers exactly three samples and default categories', () => {
  const result = readBookmarkStorage(memoryStorage())
  assert.equal(result.needsInitialization, true)
  assert.equal(result.data.bookmarks.length, 3)
  assert.ok(result.data.categories.includes('其他'))
})
test('persisted empty bookmarks remain empty and custom categories survive', () => {
  const storage = memoryStorage()
  const data = { version: 1, bookmarks: [], categories: ['AI', '我的资料'] }
  assert.equal(writeBookmarkStorage(data, storage), null)
  const result = readBookmarkStorage(storage)
  assert.equal(result.needsInitialization, false)
  assert.equal(result.data.bookmarks.length, 0)
  assert.ok(result.data.categories.includes('我的资料'))
})
test('all bookmark fields round trip through storage', () => {
  const storage = memoryStorage()
  const item = example('site', { isPinned: true, note: '笔记', icon: 'default' })
  assert.equal(writeBookmarkStorage({ version: 1, bookmarks: [item], categories: ['学习'] }, storage), null)
  assert.deepEqual(readBookmarkStorage(storage).data.bookmarks, [item])
})
test('malformed or unsafe stored data is reported without regenerating examples', () => {
  for (const value of ['{bad', JSON.stringify({ version: 2, bookmarks: [], categories: [] }), JSON.stringify({ version: 1, bookmarks: [example('site', { url: 'javascript:alert(1)' })], categories: ['学习'] })]) {
    const storage = memoryStorage(value)
    const result = readBookmarkStorage(storage)
    assert.ok(result.error)
    assert.equal(result.needsInitialization, false)
    assert.equal(result.data.bookmarks.length, 0)
    assert.equal(storage.getItem(BOOKMARK_STORAGE_KEY), value)
  }
})
test('quota/read failures return visible errors instead of pretending to save', () => {
  const storage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('quota') } }
  assert.ok(readBookmarkStorage(storage).error)
  assert.ok(writeBookmarkStorage({ version: 1, bookmarks: [], categories: [] }, storage))
})

test('arbitrary custom category names receive valid stable colors', () => {
  for (const category of ['__proto__', 'constructor', '校园资源']) {
    assert.ok(['blue', 'purple', 'pink', 'cyan', 'orange'].includes(categoryTone(category)))
    assert.equal(categoryTone(category), categoryTone(category))
  }
})
test('stored noncanonical web and icon URLs are normalized before rendering', () => {
  const item = example('site', { url: 'example.com/path', icon: 'images.example/icon.png' })
  const result = readBookmarkStorage(memoryStorage(JSON.stringify({ version: 1, bookmarks: [item], categories: ['学习'] })))
  assert.equal(result.error, null)
  assert.equal(result.data.bookmarks[0].url, 'https://example.com/path')
  assert.equal(result.data.bookmarks[0].icon, 'https://images.example/icon.png')
})

test('URL validation rejects hidden controls and backslash destination ambiguity', () => {
  for (const input of ['https://example.com/\u0000payload', 'https://example.com/\u007fpayload', 'https://example.com\\@evil.example/', 'https://example.com/\u202epayload']) {
    assert.throws(() => normalizeUrl(input), Error, JSON.stringify(input))
  }
})

test('untrusted icon values safely fall back without rendering executable or invalid URLs', () => {
  for (const icon of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'https://user:secret@example.com/icon.png', 'not a url']) {
    assert.equal(iconUrl(example('site', { icon })), '')
  }
  assert.equal(iconUrl(example('site', { url: 'javascript:alert(1)' })), '')
})

test('bookmark loading projects only known fields and does not preserve unknown nested data', () => {
  const raw = JSON.stringify({ version: 1, bookmarks: [example('site', { token: 'private-marker', extra: { nested: true } })], categories: ['学习'], secret: 'private-marker' })
  const loaded = readBookmarkStorage(memoryStorage(raw))
  assert.equal(loaded.error, null)
  assert.deepEqual(loaded.data.bookmarks, [example('site')])
  assert.equal(JSON.stringify(loaded.data).includes('private-marker'), false)
})

test('invalid persisted bookmark limits and reserved categories block loading without changing storage', () => {
  const values = [
    { bookmarks: [example('site', { id: 'x'.repeat(129) })], categories: ['学习'] },
    { bookmarks: [example('site', { name: 'x'.repeat(81) })], categories: ['学习'] },
    { bookmarks: [example('site', { note: 'x'.repeat(501) })], categories: ['学习'] },
    { bookmarks: [example('site', { category: '__all__' })], categories: ['学习'] },
    { bookmarks: [], categories: ['x'.repeat(25)] },
    { bookmarks: [], categories: Array.from({ length: 101 }, (_, i) => `category-${i}`) },
    { bookmarks: Array.from({ length: 1001 }, (_, i) => example(`site${i}`)), categories: ['学习'] },
  ]
  for (const value of values) {
    const raw = JSON.stringify({ version: 1, ...value })
    const storage = memoryStorage(raw)
    assert.ok(readBookmarkStorage(storage).error)
    assert.equal(storage.getItem(BOOKMARK_STORAGE_KEY), raw)
  }
})

test('bookmark writes reject unsafe data and whitelist fields before persisting', () => {
  const storage = memoryStorage()
  assert.ok(writeBookmarkStorage({ version: 1, bookmarks: [example('site', { url: 'javascript:alert(1)' })], categories: ['学习'] }, storage))
  assert.equal(storage.getItem(BOOKMARK_STORAGE_KEY), null)
  assert.equal(writeBookmarkStorage({ version: 1, bookmarks: [example('site', { extra: 'private-marker' })], categories: ['学习'] }, storage), null)
  assert.equal(storage.getItem(BOOKMARK_STORAGE_KEY).includes('private-marker'), false)
})

function queuedLock() {
  let tail = Promise.resolve()
  return { request(name, work) {
    assert.equal(name, 'unilife-hub:write')
    const result = tail.then(work)
    tail = result.catch(() => {})
    return result
  } }
}

test('bookmark commit rereads after waiting for restore and rejects a stale draft', async () => {
  assert.equal(typeof bookmarkStorage.commitBookmarkStorage, 'function')
  const base = { version: 1, bookmarks: [example('old')], categories: ['学习'] }
  const restored = { version: 1, bookmarks: [example('restored')], categories: ['学习'] }
  const storage = memoryStorage(JSON.stringify(base))
  const lock = queuedLock()
  let release
  const gate = new Promise(resolve => { release = resolve })
  const restore = lock.request('unilife-hub:write', async () => { await gate; writeBookmarkStorage(restored, storage) })
  const save = bookmarkStorage.commitBookmarkStorage(base, { ...base, bookmarks: [example('new')] }, storage, lock)
  release()
  await restore
  const result = await save
  assert.ok(result.error)
  assert.equal(result.data.bookmarks[0].id, 'restored')
  assert.equal(readBookmarkStorage(storage).data.bookmarks[0].id, 'restored')
})

test('bookmark initialization rereads under the restore lock and never overwrites restored data', async () => {
  assert.equal(typeof bookmarkStorage.initializeBookmarkStorage, 'function')
  const restored = { version: 1, bookmarks: [example('restored')], categories: ['学习'] }
  const storage = memoryStorage()
  const lock = queuedLock()
  let release
  const gate = new Promise(resolve => { release = resolve })
  const restore = lock.request('unilife-hub:write', async () => { await gate; writeBookmarkStorage(restored, storage) })
  const initialize = bookmarkStorage.initializeBookmarkStorage(storage, lock)
  release()
  await restore
  assert.equal((await initialize).data.bookmarks[0].id, 'restored')
  assert.equal(readBookmarkStorage(storage).data.bookmarks[0].id, 'restored')
})

test('pending recovery prevents bookmark initialization and commits from replacing protected values', async () => {
  const base = { version: 1, bookmarks: [example('old')], categories: ['学习'] }
  let raw = JSON.stringify(base)
  const storage = {
    getItem: key => key === BOOKMARK_STORAGE_KEY ? raw : key === 'unilife-recovery:v1' ? JSON.stringify({ phase: 'prepared' }) : null,
    setItem: (key, value) => { assert.equal(key, BOOKMARK_STORAGE_KEY); raw = value },
  }
  const result = await bookmarkStorage.commitBookmarkStorage(base, { ...base, bookmarks: [] }, storage)
  assert.ok(result.error)
  assert.equal(JSON.parse(raw).bookmarks[0].id, 'old')
  raw = null
  assert.ok((await bookmarkStorage.initializeBookmarkStorage(storage)).error)
  assert.equal(raw, null)
})
