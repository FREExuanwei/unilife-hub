import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, WandSparkles } from 'lucide-react'
import type { Bookmark, BookmarkDraft } from '../bookmarkTypes'
import { normalizeUrl } from '../bookmarkUtils'
import BookmarkIcon from './BookmarkIcon'

interface BookmarkFormProps {
  bookmark?: Bookmark
  categories: string[]
  onSave: (draft: BookmarkDraft) => Promise<string | null>
  onCancel: () => void
}
type FormErrors = Partial<Record<'name' | 'url' | 'category' | 'icon' | 'save', string>>

export default function BookmarkForm({ bookmark, categories, onSave, onCancel }: BookmarkFormProps) {
  const id = useId()
  const [draft, setDraft] = useState<BookmarkDraft>(() => bookmark ?? {
    name: '', url: '', category: '其他', note: '', isPinned: false, icon: 'auto',
  })
  const [categoryChoice, setCategoryChoice] = useState(draft.category)
  const [iconMode, setIconMode] = useState(['auto', 'default'].includes(draft.icon) ? draft.icon : 'custom')
  const [customIcon, setCustomIcon] = useState(iconMode === 'custom' ? draft.icon : '')
  const [previewUrl, setPreviewUrl] = useState(bookmark?.url ?? '')
  const [previewIcon, setPreviewIcon] = useState(bookmark?.icon ?? 'auto')
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)

  function change<K extends keyof BookmarkDraft>(key: K, value: BookmarkDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, save: undefined }))
  }

  function updatePreview() {
    try { setPreviewUrl(normalizeUrl(draft.url)) } catch { setPreviewUrl('') }
    try { setPreviewIcon(iconMode === 'custom' ? normalizeUrl(customIcon) : iconMode) } catch { setPreviewIcon('default') }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const nextErrors: FormErrors = {}
    if (!draft.name.trim()) nextErrors.name = '请输入网站名称。'
    try { normalizeUrl(draft.url) } catch (error) { nextErrors.url = (error as Error).message }
    const category = draft.category.trim()
    if (!category || category === '__all__' || category === '__new__') nextErrors.category = '请输入分类名称。'
    const icon = iconMode === 'custom' ? customIcon : iconMode
    if (iconMode === 'custom') {
      try { normalizeUrl(customIcon) } catch { nextErrors.icon = '请输入有效的 HTTP(S) 图标链接。' }
    }
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0]
    if (firstError) { document.getElementById(`${id}-${firstError}`)?.focus(); return }
    pending.current = true
    setSaving(true)
    try {
      const error = await onSave({ ...draft, category, icon })
      if (error) setErrors({ save: error })
    } catch { setErrors({ save: '保存失败，请保留当前输入并重试。' }) }
    finally { pending.current = false; setSaving(false) }
  }

  return (
    <form className="bookmark-form" onSubmit={submit} noValidate aria-busy={saving}>
      <div className="form-field">
        <label htmlFor={`${id}-name`}>网站名称 <span className="required-mark">*</span></label>
        <input id={`${id}-name`} value={draft.name} onChange={(event) => change('name', event.target.value)} maxLength={80} placeholder="例如：ChatGPT" autoFocus required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${id}-name-error` : undefined} />
        {errors.name && <p id={`${id}-name-error`} className="field-error">{errors.name}</p>}
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-url`}>网站网址 <span className="required-mark">*</span></label>
        <input id={`${id}-url`} value={draft.url} onChange={(event) => change('url', event.target.value)} onBlur={updatePreview} maxLength={2048} placeholder="example.com 或 https://example.com" inputMode="url" autoCapitalize="none" spellCheck={false} required aria-invalid={Boolean(errors.url)} aria-describedby={`${id}-url-hint${errors.url ? ` ${id}-url-error` : ''}`} />
        <p id={`${id}-url-hint`} className="field-hint">无需填写 https://，我们会自动补全。</p>
        {errors.url && <p id={`${id}-url-error`} className="field-error">{errors.url}</p>}
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-category-select`}>分类</label>
        <select id={`${id}-category-select`} value={categoryChoice} onChange={(event) => {
          setCategoryChoice(event.target.value)
          change('category', event.target.value === '__new__' ? '' : event.target.value)
        }}>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          <option value="__new__">＋ 新建分类</option>
        </select>
        {categoryChoice === '__new__' && <><label className="sub-label" htmlFor={`${id}-category`}>新分类名称</label><input id={`${id}-category`} value={draft.category} maxLength={24} placeholder="例如：校园服务" onChange={(event) => change('category', event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? `${id}-category-error` : undefined} /></>}
        {errors.category && <p id={`${id}-category-error`} className="field-error">{errors.category}</p>}
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-note`}>备注 <span className="optional-label">选填</span></label>
        <textarea id={`${id}-note`} value={draft.note} onChange={(event) => change('note', event.target.value)} maxLength={500} rows={2} placeholder="写下一点使用心得或提醒…" />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-icon-mode`}>网站图标</label>
        <div className="icon-settings">
          <BookmarkIcon bookmark={{ url: previewUrl || 'https://example.invalid/', icon: previewUrl ? previewIcon : 'default' }} />
          <select id={`${id}-icon-mode`} value={iconMode} onChange={(event) => { setIconMode(event.target.value); setPreviewIcon(event.target.value === 'custom' ? 'default' : event.target.value) }}>
            <option value="auto">自动获取网站图标</option><option value="default">使用默认图标</option><option value="custom">自定义图标链接</option>
          </select>
        </div>
        {iconMode === 'custom' && <><label className="sub-label" htmlFor={`${id}-icon`}>图标链接</label><input id={`${id}-icon`} value={customIcon} onChange={(event) => { setCustomIcon(event.target.value); setErrors((current) => ({ ...current, icon: undefined, save: undefined })) }} onBlur={updatePreview} placeholder="https://example.com/icon.png" inputMode="url" maxLength={2048} aria-invalid={Boolean(errors.icon)} aria-describedby={errors.icon ? `${id}-icon-error` : undefined} /></>}
        {errors.icon && <p id={`${id}-icon-error`} className="field-error">{errors.icon}</p>}
        <p className="field-hint"><WandSparkles size={13} aria-hidden="true" />图标加载失败时自动使用默认图标。</p>
      </div>
      <label className="pin-option"><span><strong>置顶这个网站</strong><small>让常用网站排在最前面</small></span><input type="checkbox" checked={draft.isPinned} onChange={(event) => change('isPinned', event.target.checked)} /></label>
      {errors.save && <p className="form-save-error" role="alert">{errors.save}</p>}
      <footer className="form-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>取消</button><button type="submit" className="primary-button" disabled={saving}><Check size={17} aria-hidden="true" />{saving ? '正在保存…' : bookmark ? '保存修改' : '添加网站'}</button></footer>
    </form>
  )
}
