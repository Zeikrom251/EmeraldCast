import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  Check,
  Compass,
  Github,
  Keyboard,
  LayoutGrid,
  MessageSquare,
  PanelRight,
  Plus,
  Share2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../Logo'
import { Kbd } from '../Kbd'
import { useStream } from '../../context/StreamContext'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { useSavedWalls } from '../../hooks/useSavedWalls'
import { buildShareUrl, cn, copyShareUrl } from '../../lib/utils'

const iconBtn =
  'rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
const textBtn =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'

function Divider() {
  return <span className="h-5 w-px shrink-0 bg-[var(--border-default)]" aria-hidden />
}

function LayoutSwitch() {
  const { mode, setMode, canFocus } = useLayoutMode()
  const options = [
    { value: 'grid', label: 'Grid layout', Icon: LayoutGrid },
    { value: 'focus', label: 'Focus layout', Icon: PanelRight },
  ] as const

  return (
    <div className="flex gap-0.5 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-[3px]">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          disabled={value === 'focus' && !canFocus}
          className={cn(
            'rounded-[7px] p-1.5 transition-colors disabled:opacity-40',
            mode === value
              ? 'bg-[var(--bg-hover)] text-[var(--accent)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
          title={label}
          aria-label={label}
          aria-pressed={mode === value}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}

function ShareButton() {
  const { streams, mainId, audioFocusId } = useStream()
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (!(await copyShareUrl(buildShareUrl(streams, mainId, audioFocusId)))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleShare} className={textBtn} title="Copy a link to this wall">
      {copied ? <Check size={15} className="text-[var(--accent)]" /> : <Share2 size={15} />}
      {copied ? 'Copied' : 'Share'}
    </button>
  )
}

function SaveWallButton() {
  const { streams, mainId } = useStream()
  const { save } = useSavedWalls()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    const main = streams.find((s) => s.id === mainId)?.channel ?? null
    save(
      trimmed,
      streams.map((s) => s.channel),
      main
    )
    setName('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(textBtn, 'border border-[var(--border-default)]')}
        aria-expanded={open}
      >
        <Bookmark size={15} />
        Save wall
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-2xl">
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            Save these {streams.length} streams to reopen them later from ⌘K or the home screen.
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Friday speedruns"
              className="min-w-0 flex-1 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="rounded-[10px] bg-[var(--accent)] px-3 text-[13px] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Header({
  onOpenPalette,
  onShowShortcuts,
  browseOpen,
  onToggleBrowse,
}: {
  onOpenPalette: () => void
  onShowShortcuts: () => void
  browseOpen: boolean
  onToggleBrowse: () => void
}) {
  const { streams, chatOpen, toggleChat } = useStream()
  const hasStreams = streams.length > 0

  return (
    <header className="grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--border-subtle)] px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" aria-label="EmeraldCast home">
          <Logo />
        </Link>
        {hasStreams && (
          <>
            <Divider />
            <span className="hidden rounded-full bg-[var(--bg-hover)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-secondary)] md:inline">
              {streams.length} stream{streams.length > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      <button
        onClick={onOpenPalette}
        className="flex h-10 w-[min(420px,40vw)] items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] pl-3 pr-2 text-left text-[13px] text-[var(--text-muted)] transition-colors hover:border-[var(--text-muted)]"
      >
        <Plus size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {hasStreams ? 'Add a channel…' : 'Add a channel or paste a twitch.tv link'}
        </span>
        <span className="hidden sm:inline-flex">
          <Kbd>⌘K</Kbd>
        </span>
      </button>

      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={onToggleBrowse}
          className={cn(
            textBtn,
            browseOpen && 'bg-[var(--accent-tint)] text-[var(--accent)] hover:text-[var(--accent)]'
          )}
          title="Browse categories (B)"
          aria-pressed={browseOpen}
        >
          <Compass size={15} />
          <span className="hidden md:inline">Browse</span>
        </button>
        {hasStreams && (
          <div className="hidden items-center gap-1.5 lg:flex">
            <LayoutSwitch />
            <Divider />
            <ShareButton />
            <SaveWallButton />
          </div>
        )}
        {hasStreams && (
          <button
            onClick={toggleChat}
            className={cn(
              iconBtn,
              chatOpen && 'bg-[var(--accent-tint)] text-[var(--accent)] hover:text-[var(--accent)]'
            )}
            title="Toggle chat (C)"
            aria-label="Toggle chat"
            aria-pressed={chatOpen}
          >
            <MessageSquare size={16} />
          </button>
        )}
        <button
          onClick={onShowShortcuts}
          className={iconBtn}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard size={16} />
        </button>
        {!hasStreams && (
          <a
            href="https://github.com/Zeikrom251/EmeraldCast"
            target="_blank"
            rel="noopener noreferrer"
            className={iconBtn}
            title="View on GitHub"
            aria-label="View on GitHub"
          >
            <Github size={16} />
          </a>
        )}
      </div>
    </header>
  )
}
