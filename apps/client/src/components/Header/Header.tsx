import { Github, Tv2, Gamepad2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SearchBar } from '../SearchBar'
import { useStream } from '../../context/StreamContext'
import { cn } from '../../lib/utils'

export function Header() {
  const { streams, nativeModeAll, toggleAllNativeMode } = useStream()
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
