import test from 'node:test'
import assert from 'node:assert/strict'
import * as theme from '../src/utils/theme.ts'

test('unavailable theme storage falls back to system with an explicit error result', () => {
  assert.equal(typeof theme.readThemeStorage, 'function')
  const result = theme.readThemeStorage({ getItem() { throw Error('blocked') } })
  assert.equal(result.preference, 'system')
  assert.ok(result.error)
})

test('theme writer surfaces quota failures and does not report the unpersisted preference', async () => {
  assert.equal(typeof theme.commitThemePreference, 'function')
  const storage = { getItem: key => key === 'unilife-theme' ? 'light' : null, setItem() { throw Error('quota') } }
  const result = await theme.commitThemePreference('light', 'dark', storage)
  assert.ok(result.error)
  assert.equal(result.preference, 'light')
})

test('theme write rereads after restore lock and rejects a stale preference', async () => {
  assert.equal(typeof theme.commitThemePreference, 'function')
  let stored = 'light'
  const storage = { getItem: key => key === 'unilife-theme' ? stored : null, setItem(key, value) { assert.equal(key, 'unilife-theme'); stored = value } }
  let tail = Promise.resolve()
  const locks = { request(name, work) {
    assert.equal(name, 'unilife-hub:write')
    const result = tail.then(work)
    tail = result.catch(() => {})
    return result
  } }
  let release
  const gate = new Promise(resolve => { release = resolve })
  const restore = locks.request('unilife-hub:write', async () => { await gate; stored = 'system' })
  const toggle = theme.commitThemePreference('light', 'dark', storage, locks)
  release()
  await restore
  const result = await toggle
  assert.ok(result.error)
  assert.equal(result.preference, 'system')
  assert.equal(stored, 'system')
})

test('successful theme persistence returns the saved preference and rejects invalid values', async () => {
  assert.equal(typeof theme.commitThemePreference, 'function')
  let stored = 'light'
  const storage = { getItem: key => key === 'unilife-theme' ? stored : null, setItem(key, value) { assert.equal(key, 'unilife-theme'); stored = value } }
  const saved = await theme.commitThemePreference('light', 'dark', storage)
  assert.deepEqual(saved, { preference: 'dark', error: null })
  const invalid = await theme.commitThemePreference('dark', 'unknown', storage)
  assert.ok(invalid.error)
  assert.equal(stored, 'dark')
})

test('pending recovery blocks theme writes while preserving the stored preference', async () => {
  let stored = 'light'
  const storage = {
    getItem: key => key === 'unilife-theme' ? stored : key === 'unilife-recovery:v1' ? JSON.stringify({ phase: 'prepared' }) : null,
    setItem(key, value) { assert.equal(key, 'unilife-theme'); stored = value },
  }
  const result = await theme.commitThemePreference('light', 'dark', storage)
  assert.ok(result.error)
  assert.equal(stored, 'light')
})
