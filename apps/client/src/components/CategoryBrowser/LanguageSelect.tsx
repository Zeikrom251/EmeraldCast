import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
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
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex min-w-[9rem] items-center justify-between gap-2 rounded-lg border bg-[var(--bg-elevated)] py-1.5 pl-3 pr-2 text-xs font-medium text-[var(--text-primary)] transition-all',
          open
            ? 'border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-glow)]'
            : 'border-[var(--border-default)] hover:border-[var(--text-muted)]'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.label}
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
          className="absolute right-0 top-full z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 p-1 shadow-2xl backdrop-blur-md"
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
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
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
