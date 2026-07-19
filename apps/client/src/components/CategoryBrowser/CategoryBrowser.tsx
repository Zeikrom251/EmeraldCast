import { memo, useEffect, useRef, useState } from 'react'
import {
  Search,
  X,
  ArrowLeft,
  Loader2,
  Eye,
  Gamepad2,
  Star,
  Languages,
  Check,
  CheckSquare,
} from 'lucide-react'
import axios from 'axios'
import { api } from '../../lib/api'
import { useStream } from '../../context/StreamContext'
import { useFavoriteCategories } from '../../hooks/useFavoriteCategories'
import { formatViewerCount } from '../../lib/utils'
import { LanguageSelect } from './LanguageSelect'
import type { TwitchCategory, CategoryStream } from '@repo/types'

interface CategoryBrowserProps {
  open: boolean
  onClose: () => void
  initialCategory?: TwitchCategory | null
}

const CategoryCard = memo(function CategoryCard({
  category,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  category: TwitchCategory
  favorite: boolean
  onOpen: (category: TwitchCategory) => void
  onToggleFavorite: (category: TwitchCategory) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(category)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(category)
        }
      }}
      className="group flex cursor-pointer flex-col gap-1.5 text-left focus:outline-none"
      title={category.name}
    >
      <div className="relative overflow-hidden rounded-lg border border-[var(--border-subtle)] transition-colors group-hover:border-[var(--accent)] group-focus-visible:border-[var(--accent)]">
        <img
          src={category.boxArtUrl}
          alt={category.name}
          className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(category)
          }}
          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
          title={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
        >
          <Star
            size={13}
            className={favorite ? 'text-yellow-400' : 'text-white'}
            fill={favorite ? 'currentColor' : 'none'}
          />
        </button>
      </div>
      <p className="truncate text-xs font-medium text-[var(--text-primary)]">{category.name}</p>
    </div>
  )
})

const StreamCard = memo(function StreamCard({
  stream,
  onSelect,
  selectable,
  selected,
}: {
  stream: CategoryStream
  onSelect: (login: string) => void
  selectable: boolean
  selected: boolean
}) {
  return (
    <button
      onClick={() => onSelect(stream.login)}
      className={`group flex flex-col overflow-hidden rounded-lg border bg-[var(--bg-elevated)] text-left transition-colors ${
        selected
          ? 'border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-glow)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent)]'
      }`}
      title={selectable ? `${stream.title} — Toggle selection` : `${stream.title} — Add to grid`}
      aria-pressed={selectable ? selected : undefined}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        <img
          src={stream.thumbnailUrl}
          alt={stream.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        {selectable && (
          <span
            className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
              selected
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-white/70 bg-black/50 text-transparent'
            }`}
          >
            <Check size={13} strokeWidth={3} />
          </span>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-sm bg-red-600 px-1 py-0.5 text-[9px] font-bold uppercase leading-none text-white">
          Live
        </span>
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Eye size={9} />
          {formatViewerCount(stream.viewerCount)}
        </span>
      </div>
      <div className="min-w-0 px-2 py-1.5">
        <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
          {stream.displayName}
        </p>
        <p className="truncate text-[11px] text-[var(--text-muted)]">{stream.title}</p>
      </div>
    </button>
  )
})

export function CategoryBrowser({ open, onClose, initialCategory }: CategoryBrowserProps) {
  const { addStream, addStreams } = useStream()
  const { favorites, isFavorite, toggleFavorite } = useFavoriteCategories()

  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<TwitchCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const [selected, setSelected] = useState<TwitchCategory | null>(null)
  const [language, setLanguage] = useState('')
  const [streamFilter, setStreamFilter] = useState('')
  const [streams, setStreams] = useState<CategoryStream[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingStreams, setLoadingStreams] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Multi-select mode: pick several streams before adding them to the grid all
  // at once, instead of the default one-click-adds-and-closes behaviour.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedLogins, setSelectedLogins] = useState<Set<string>>(() => new Set())

  const inputRef = useRef<HTMLInputElement>(null)

  const searching = Boolean(query.trim())
  const showDefault = !selected && !searching

  // Clear everything back to the browse screen. Only the X button resets; every
  // other way of closing (backdrop, Escape, picking a stream) preserves state,
  // so reopening the modal lands you right back where you left off.
  function reset() {
    setQuery('')
    setCategories([])
    setSelected(null)
    setStreams([])
    setCursor(null)
    setStreamFilter('')
    setSelectMode(false)
    setSelectedLogins(new Set())
  }

  function dismiss() {
    reset()
    onClose()
  }

  // On open, either jump straight to a preselected category (e.g. from the
  // discovery view) or focus the search field.
  useEffect(() => {
    if (!open) return
    if (initialCategory) {
      setSelected(initialCategory)
    } else {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(id)
    }
  }, [open, initialCategory])

  // Close on Escape (backs out of a category first).
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (selected) setSelected(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, selected, onClose])

  // Debounced category search.
  useEffect(() => {
    if (!open || selected) return
    const trimmed = query.trim()
    if (!trimmed) {
      setCategories([])
      setLoadingCategories(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoadingCategories(true)
      try {
        const data = await api.twitch.searchCategories(trimmed, controller.signal)
        setCategories(data)
        setLoadingCategories(false)
      } catch (err) {
        if (!axios.isCancel(err)) setLoadingCategories(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query, open, selected])

  // (Re)load the first page of streams when a category is picked or the language changes.
  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    setLoadingStreams(true)
    setStreams([])
    setCursor(null)
    setStreamFilter('')
    setSelectMode(false)
    setSelectedLogins(new Set())
    ;(async () => {
      try {
        const page = await api.twitch.categoryStreams(selected.id, { language }, controller.signal)
        setStreams(page.streams)
        setCursor(page.cursor)
        setLoadingStreams(false)
      } catch (err) {
        if (!axios.isCancel(err)) setLoadingStreams(false)
      }
    })()
    return () => controller.abort()
  }, [selected, language])

  async function loadMore() {
    if (!selected || !cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await api.twitch.categoryStreams(selected.id, { cursor, language })
      setStreams((prev) => [...prev, ...page.streams])
      setCursor(page.cursor)
    } catch {
      // keep existing streams on failure
    } finally {
      setLoadingMore(false)
    }
  }

  function handleSelectStream(login: string) {
    if (selectMode) {
      setSelectedLogins((prev) => {
        const next = new Set(prev)
        if (next.has(login)) next.delete(login)
        else next.add(login)
        return next
      })
      return
    }
    addStream(login)
    onClose()
  }

  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) setSelectedLogins(new Set())
      return !prev
    })
  }

  // Add every currently selected stream to the grid in one batch, then close.
  function addSelected() {
    if (selectedLogins.size === 0) return
    addStreams([...selectedLogins])
    setSelectMode(false)
    setSelectedLogins(new Set())
    onClose()
  }

  // Select all streams currently visible (respecting the active keyword filter).
  function selectAllVisible() {
    setSelectedLogins((prev) => {
      const next = new Set(prev)
      for (const s of filteredStreams) next.add(s.login)
      return next
    })
  }

  // Client-side filter over the streams already loaded. Twitch's API has no
  // keyword search within a category's live streams, so this narrows down what's
  // on screen (across the pages fetched via "Load more") by title or tag.
  const filterTerm = streamFilter.trim().toLowerCase()
  const filteredStreams = filterTerm
    ? streams.filter(
        (s) =>
          s.title.toLowerCase().includes(filterTerm) ||
          s.tags.some((tag) => tag.toLowerCase().includes(filterTerm)),
      )
    : streams

  const heading = selected ? selected.name : 'Browse Categories'

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
          {selected ? (
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={14} />
              Categories
            </button>
          ) : (
            <Gamepad2 size={16} className="text-[var(--accent)]" />
          )}
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text-primary)]">
            {heading}
          </h2>
          <button
            onClick={dismiss}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category search bar (hidden while viewing a category) */}
        {!selected && (
          <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
              <Search size={16} className="shrink-0 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search a category… (e.g. Grand Theft Auto V, Just Chatting)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Keyword filter + language toolbar (while viewing a category) */}
        {selected && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
              <Search size={14} className="shrink-0 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter loaded streams by title or tag…"
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              {streamFilter && (
                <button
                  onClick={() => setStreamFilter('')}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Clear filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
              <Languages size={13} />
              Language
            </span>
            <LanguageSelect value={language} onChange={setLanguage} />
            <button
              onClick={toggleSelectMode}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                selectMode
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                  : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Select multiple streams to add at once"
              aria-pressed={selectMode}
            >
              <CheckSquare size={13} />
              {selectMode ? 'Selecting' : 'Select multiple'}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="min-h-[16rem] flex-1 overflow-y-auto p-4">
          {/* Default view: favorites */}
          {showDefault && (
            <>
              {favorites.length > 0 ? (
                <section>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Star size={13} className="text-yellow-400" fill="currentColor" />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      Favorites
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {favorites.map((cat) => (
                      <CategoryCard
                        key={cat.id}
                        category={cat}
                        favorite
                        onOpen={setSelected}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">
                  Search for a category above, then tap the ★ on any category to save it here for
                  quick access.
                </p>
              )}
            </>
          )}

          {/* Search results */}
          {searching && !selected && (
            <>
              {loadingCategories && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  Searching…
                </div>
              )}

              {!loadingCategories && categories.length === 0 && (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">
                  No categories found for “{query.trim()}”.
                </p>
              )}

              {!loadingCategories && categories.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {categories.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      favorite={isFavorite(cat.id)}
                      onOpen={setSelected}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Streams grid */}
          {selected && (
            <>
              {loadingStreams && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  Loading streams…
                </div>
              )}

              {!loadingStreams && streams.length === 0 && (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">
                  No one is live in {selected.name}
                  {language ? ' in this language' : ''} right now.
                </p>
              )}

              {!loadingStreams && streams.length > 0 && filteredStreams.length === 0 && (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">
                  No loaded streams match “{streamFilter.trim()}”. Try “Load more” to fetch
                  additional streams, then filter again.
                </p>
              )}

              {!loadingStreams && filteredStreams.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredStreams.map((s) => (
                    <StreamCard
                      key={s.login}
                      stream={s}
                      onSelect={handleSelectStream}
                      selectable={selectMode}
                      selected={selectedLogins.has(s.login)}
                    />
                  ))}
                </div>
              )}

              {!loadingStreams && streams.length > 0 && cursor && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 size={13} className="animate-spin" />}
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Multi-select action bar */}
        {selected && selectMode && (
          <div className="flex shrink-0 items-center gap-3 border-t border-[var(--border-subtle)] px-4 py-3">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {selectedLogins.size} selected
            </span>
            <button
              onClick={selectAllVisible}
              disabled={filteredStreams.length === 0}
              className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Select all shown
            </button>
            {selectedLogins.size > 0 && (
              <button
                onClick={() => setSelectedLogins(new Set())}
                className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
            )}
            <button
              onClick={addSelected}
              disabled={selectedLogins.size === 0}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check size={14} strokeWidth={3} />
              Add {selectedLogins.size > 0 ? selectedLogins.size : ''}{' '}
              {selectedLogins.size === 1 ? 'stream' : 'streams'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
