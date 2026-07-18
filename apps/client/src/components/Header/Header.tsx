import { useState } from 'react'
import { Github, Tv2, Gamepad2, LayoutGrid, Share2, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SearchBar } from '../SearchBar'
import { CollectionsMenu } from '../CollectionsMenu'
import { useStream } from '../../context/StreamContext'
import { useCategoryBrowser } from '../../context/CategoryBrowserContext'
import { cn, buildShareUrl } from '../../lib/utils'

export function Header() {
  const { streams, mainId, audioFocusId, nativeModeAll, toggleAllNativeMode } = useStream()
  const { openBrowser } = useCategoryBrowser()
  const [shared, setShared] = useState(false)

  async function handleShare() {
    const url = buildShareUrl(streams, mainId, audioFocusId)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard blocked (e.g. insecure context) — fall back to a prompt
      window.prompt('Copy this shareable link:', url)
      return
    }
    setShared(true)
    window.setTimeout(() => setShared(false), 2000)
  }
  return (
    <header className="relative flex shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5">
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <img src="/emeraldcast.svg" alt="EmeraldCast" className="h-7 w-auto" />
        <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
          EMERALD<span className="text-[var(--accent)]">CAST</span>
        </span>
        {streams.length > 0 && (
          <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
            {streams.length} live view{streams.length > 1 ? 's' : ''}
          </span>
        )}
      </Link>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto w-full max-w-md px-4">
          <SearchBar />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {streams.length > 0 && (
          <button
            onClick={handleShare}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
              shared
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
            title="Copy a shareable link to this multi-view"
            aria-label="Copy a shareable link to this multi-view"
          >
            {shared ? <Check size={14} /> : <Share2 size={14} />}
            {shared ? 'Copied!' : 'Share'}
          </button>
        )}
        <button
          onClick={() => openBrowser()}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          title="Browse streams by category"
          aria-label="Browse streams by category"
        >
          <LayoutGrid size={14} />
          Categories
        </button>
        <CollectionsMenu />
        <button
          onClick={toggleAllNativeMode}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
            nativeModeAll
              ? 'bg-purple-600 text-white hover:bg-purple-500'
              : 'border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
          )}
          title={nativeModeAll ? 'Switch to EmeraldCast mode' : 'Switch to Native Twitch mode'}
          aria-label={nativeModeAll ? 'Switch to EmeraldCast mode' : 'Switch to Native Twitch mode'}
        >
          {nativeModeAll ? <Gamepad2 size={14} /> : <Tv2 size={14} />}
          {nativeModeAll ? 'EmeraldCast Mode' : 'Twitch Mode'}
        </button>
        <a
          href="https://github.com/Zeikrom251/EmeraldCast"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="View on GitHub"
          aria-label="View on GitHub"
        >
          <Github size={16} />
        </a>
      </div>
    </header>
  )
}
