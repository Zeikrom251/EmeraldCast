import { Github, Keyboard, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SearchBar } from '../SearchBar'
import { CollectionsMenu } from '../CollectionsMenu'
import { ViewMenu } from '../ViewMenu'
import { useStream } from '../../context/StreamContext'
import { useCategoryBrowser } from '../../context/CategoryBrowserContext'

export function Header({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { streams } = useStream()
  const { openBrowser } = useCategoryBrowser()

  return (
    <header className="relative flex shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5">
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <img src="/emeraldcast-mark.png" alt="EmeraldCast" className="h-7 w-auto" />
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
        <ViewMenu />
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
          onClick={onShowShortcuts}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard size={16} />
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
