import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useStreamSearch } from '../../hooks/useStreamSearch'
import { useStream } from '../../context/StreamContext'
import { formatViewerCount } from '../../lib/utils'
import type { TwitchSearchResult } from '@repo/types'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { results, loading } = useStreamSearch(query)
  const { addStream } = useStream()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(result: TwitchSearchResult) {
    addStream(result.login)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      addStream(query.trim())
      setQuery('')
      setOpen(false)
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
        <Search size={16} className="shrink-0 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a stream…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (query.trim() || loading) && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 shadow-2xl backdrop-blur-md"
        >
          {loading && <li className="px-3 py-2 text-sm text-[var(--text-muted)]">Searching…</li>}

          {!loading && results.length === 0 && query.trim() && (
            <li
              role="option"
              aria-selected={false}
              className="cursor-pointer px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              onClick={() => {
                addStream(query.trim())
                setQuery('')
                setOpen(false)
              }}
            >
              Add <span className="font-medium text-[var(--text-primary)]">{query.trim()}</span>{' '}
              directly
            </li>
          )}

          {results.map((r) => (
            <li
              key={r.login}
              role="option"
              aria-selected={false}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--bg-hover)]"
              onClick={() => handleSelect(r)}
            >
              <img
                src={r.profileImageUrl}
                alt={r.displayName}
                className="h-8 w-8 rounded-full object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {r.displayName}
                </p>
                {r.isLive && (
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--live-dot)]" />
                    {r.gameName} · {formatViewerCount(r.viewerCount)} viewers
                  </p>
                )}
              </div>
              {r.isLive && (
                <span className="shrink-0 rounded-sm bg-[var(--live-dot)] px-1 py-0.5 text-[10px] font-bold uppercase leading-none text-white">
                  Live
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
