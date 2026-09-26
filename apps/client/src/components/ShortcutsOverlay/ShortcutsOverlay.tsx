import { useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'
import { SHORTCUTS } from '../../hooks/useKeyboardShortcuts'
import { Kbd } from '../Kbd'

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030806]/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
          <Keyboard size={14} className="text-[var(--accent)]" />
          <h2 className="font-display text-base font-bold tracking-tight text-[var(--text-primary)]">
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[13px] text-[var(--text-secondary)]">
                {shortcut.description}
              </span>
              <Kbd>{shortcut.keys}</Kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
