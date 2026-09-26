import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, Globe } from 'lucide-react'
import { STREAM_LANGUAGES } from '../../lib/languages'
import { cn } from '../../lib/utils'

interface LanguageSelectProps {
  value: string
  onChange: (code: string) => void
}

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = STREAM_LANGUAGES.find((l) => l.code === value) ?? STREAM_LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    // Capture phase, so Escape closes only this list and not the panel around it.
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 min-w-[9.5rem] items-center gap-2 rounded-[10px] border bg-[var(--bg-elevated)] pl-3 pr-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-all',
          open
            ? 'border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-glow)]'
            : 'border-[var(--border-default)] hover:border-[var(--text-muted)]'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={14} className="shrink-0" />
        <span className="flex-1 truncate text-left">{selected.label}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-[var(--text-muted)] transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-2xl"
        >
          {STREAM_LANGUAGES.map((l) => {
            const isSelected = l.code === value
            return (
              <li key={l.code || 'all'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(l.code)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                    isSelected
                      ? 'bg-[var(--bg-hover)] font-medium text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {l.label}
                  {isSelected && <Check size={13} className="shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
