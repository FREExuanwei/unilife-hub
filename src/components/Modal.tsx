import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  compact?: boolean
}

export default function Modal({ title, subtitle, onClose, children, compact }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <dialog ref={ref} className={`bookmark-dialog${compact ? ' compact-dialog' : ''}`} aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter(item => item.getClientRects().length > 0)
        const first = items[0]
        const last = items.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="bookmark-modal-content">
        <header className="bookmark-modal-header">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={21} aria-hidden="true" /></button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

