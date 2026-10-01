import { useEffect, useState } from 'react'
import { Check, Compass, Eye, Filter, ListChecks, Loader2, Plus, Search, Star, X } from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { useFavoriteCategories } from '../../hooks/useFavoriteCategories'
import { getCategoryStreams, getTopCategories, searchCategories } from '../../lib/twitch'
import { cn, formatViewerCount } from '../../lib/utils'
import type { CategoryStream, TwitchCategory } from '../../types'
import { Kbd } from '../Kbd'
import { LanguageSelect } from './LanguageSelect'

const iconBtn =
  'rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
const input =
  'flex h-10 items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 flex items-center gap-2 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
      {children}
    </h3>
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 py-10 text-center text-sm text-[var(--text-muted)]">
      {children}
    </p>
  )
}

function CategoryRow({
  category,
  active,
  onPick,
}: {
  category: TwitchCategory
  active: boolean
  onPick: () => void
}) {
  return (
    <button
      onClick={onPick}
      aria-current={active || undefined}
      className={cn(
        'relative flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors',
        active
          ? 'bg-[var(--accent-tint)] text-[var(--accent)] before:absolute before:left-0 before:top-2.5 before:h-5 before:w-[3px] before:rounded-full before:bg-[var(--accent)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      )}
    >
      <img
        src={category.boxArtUrl}
        alt=""
        loading="lazy"
        className="h-[30px] w-[22px] shrink-0 rounded bg-[var(--bg-elevated)] object-cover"
      />
      <span className={cn('min-w-0 flex-1 truncate text-[13px]', active ? 'font-semibold' : 'font-medium')}>
        {category.name}
      </span>
      {category.viewerCount !== undefined && (
        <span
          className={cn(
            'shrink-0 font-mono text-[11px]',
            active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
          )}
        >
          {formatViewerCount(category.viewerCount)}
        </span>
      )}
    </button>
  )
}

function CategoryRows({
  categories,
  activeId,
  onPick,
}: {
  categories: TwitchCategory[]
  activeId?: string
  onPick: (category: TwitchCategory) => void
}) {
  return (
    <div className="space-y-0.5">
      {categories.map((c) => (
        <CategoryRow key={c.id} category={c} active={c.id === activeId} onPick={() => onPick(c)} />
      ))}
    </div>
  )
}

function CategoryRail({
  favorites,
  top,
  topFailed,
  activeId,
  onPick,
}: {
  favorites: TwitchCategory[]
  top: TwitchCategory[] | null
  topFailed: boolean
  activeId?: string
  onPick: (category: TwitchCategory) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TwitchCategory[] | null>(null)

  useEffect(() => {
    const q = query.trim()
    setResults(null)
    if (!q) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchCategories(q, controller.signal)
        .then(setResults)
        .catch(() => !controller.signal.aborted && setResults([]))
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <nav
      className="flex max-h-[38%] shrink-0 flex-col border-b border-[var(--border-subtle)] bg-[#090f0d] md:max-h-none md:w-60 md:border-b-0 md:border-r"
      aria-label="Categories"
    >
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-[18px]">
        <Compass size={16} className="text-[var(--accent)]" />
        <h2 className="font-display text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
          Browse
        </h2>
      </div>
      <div className="px-4 pb-3">
        <label className={cn(input, 'h-9')}>
          <Search size={15} className="shrink-0 text-[var(--text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[var(--text-muted)]"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-2.5 pb-3">
        {query.trim() ? (
          results === null ? (
            <Status>
              <Loader2 size={15} className="animate-spin" /> Searching…
            </Status>
          ) : results.length === 0 ? (
            <Status>No category matches “{query.trim()}”.</Status>
          ) : (
            <CategoryRows categories={results} activeId={activeId} onPick={onPick} />
          )
        ) : (
          <>
            {favorites.length > 0 && (
              <section>
                <SectionLabel>
                  <Star size={11} className="text-[#ffd166]" fill="currentColor" /> Favorites
                </SectionLabel>
                <CategoryRows categories={favorites} activeId={activeId} onPick={onPick} />
              </section>
            )}
            <section>
              <SectionLabel>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Top categories
              </SectionLabel>
              {topFailed ? (
                <Status>Couldn’t reach Twitch.</Status>
              ) : top === null ? (
                <Status>
                  <Loader2 size={15} className="animate-spin" /> Loading…
                </Status>
              ) : (
                <CategoryRows categories={top} activeId={activeId} onPick={onPick} />
              )}
            </section>
          </>
        )}
      </div>

      <div className="hidden items-center gap-2 border-t border-[var(--border-subtle)] px-5 py-3.5 text-xs text-[var(--text-muted)] md:flex">
        <Kbd>Esc</Kbd> to close
      </div>
    </nav>
  )
}

function StreamCard({
  stream,
  onWall,
  selectMode,
  selected,
  onClick,
}: {
  stream: CategoryStream
  onWall: boolean
  selectMode: boolean
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={onWall}
      aria-pressed={selectMode ? selected : undefined}
      title={onWall ? 'Already on your wall' : selectMode ? 'Toggle selection' : 'Add to wall'}
      className="group min-w-0 text-left disabled:cursor-default"
    >
      <div
        className={cn(
          'relative aspect-video overflow-hidden rounded-[10px] bg-[var(--bg-elevated)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] transition',
          selected && 'outline-2 -outline-offset-2 outline-[var(--accent)]',
          !onWall && !selected && 'group-hover:outline-[var(--text-muted)]'
        )}
      >
        <img
          src={stream.thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-2 top-2 rounded-[5px] bg-[var(--live-dot)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
          LIVE
        </span>
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-[#050807]/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
          <Eye size={11} />
          {formatViewerCount(stream.viewerCount)}
        </span>
        {onWall ? (
          <span className="absolute right-2 top-2 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-ink)]">
            On wall
          </span>
        ) : selectMode ? (
          <span
            className={cn(
              'absolute right-2 top-2 flex h-[20px] w-[20px] items-center justify-center rounded-full',
              selected
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'border border-white/70 bg-[#050807]/60 text-transparent'
            )}
          >
            <Check size={13} strokeWidth={3} />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-ink)]">
              <Plus size={13} strokeWidth={2.5} /> Add
            </span>
          </span>
        )}
      </div>
      <div className="mt-2.5 flex gap-2.5">
        <img
          src={stream.profileImageUrl}
          alt=""
          loading="lazy"
          className="h-7 w-7 shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
            {stream.displayName}
          </p>
          <p className="truncate text-xs text-[var(--text-secondary)]">{stream.title}</p>
          {stream.tags.length > 0 && (
            <div className="mt-1 flex gap-1 overflow-hidden">
              {stream.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="shrink-0 rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function CategoryStreams({
  category,
  favorite,
  onToggleFavorite,
  onClose,
}: {
  category: TwitchCategory
  favorite: boolean
  onToggleFavorite: () => void
  onClose: () => void
}) {
  const { streams: wall, addStream, addStreams } = useStream()
  const [language, setLanguage] = useState('')
  const [filter, setFilter] = useState('')
  const [streams, setStreams] = useState<CategoryStream[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  // (Re)load the first page whenever the category or language changes.
  useEffect(() => {
    const controller = new AbortController()
    setStreams(null)
    setFailed(false)
    getCategoryStreams(category.id, { language }, controller.signal)
      .then((page) => {
        setStreams(page.streams)
        setCursor(page.cursor)
      })
      .catch(() => !controller.signal.aborted && setFailed(true))
    return () => controller.abort()
  }, [category.id, language])

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await getCategoryStreams(category.id, { cursor, language })
      // Twitch pages by live viewer count, so a stream can move across a page
      // boundary between requests; drop the repeats.
      setStreams((prev) => {
        const seen = new Set(prev?.map((s) => s.login))
        return [...(prev ?? []), ...page.streams.filter((s) => !seen.has(s.login))]
      })
      setCursor(page.cursor)
    } catch {
      // keep what is loaded; the button stays so the user can retry
    } finally {
      setLoadingMore(false)
    }
  }

  const onWall = new Set(wall.map((s) => s.channel))
  const q = filter.trim().toLowerCase()
  const visible = (streams ?? []).filter(
    (s) =>
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.displayName.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
  )

  function toggle(login: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(login)) next.add(login)
      return next
    })
  }

  function exitSelectMode() {
    setSelected(new Set())
    setSelectMode(false)
  }

  function addSelected() {
    addStreams([...selected])
    exitSelectMode()
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={category.name}>
      <div className="flex items-center gap-3.5 px-6 pb-4 pt-5">
        <img
          src={category.boxArtUrl}
          alt=""
          className="h-[46px] w-[34px] shrink-0 rounded-md bg-[var(--bg-elevated)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[22px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
            {category.name}
          </h2>
          {category.viewerCount !== undefined && (
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--live-dot)]" />
              {formatViewerCount(category.viewerCount)} watching
            </p>
          )}
        </div>
        <button
          onClick={onToggleFavorite}
          className={cn(
            iconBtn,
            'p-2',
            favorite && 'bg-[var(--bg-hover)] text-[#ffd166] hover:text-[#ffd166]'
          )}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
        >
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={onClose} className={cn(iconBtn, 'p-2')} aria-label="Close browser">
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-3 px-6 pb-4">
        <label className={cn(input, 'min-w-0 flex-1')}>
          <Filter size={14} className="shrink-0 text-[var(--text-muted)]" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title or tag"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </label>
        <LanguageSelect value={language} onChange={setLanguage} />
        <button
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          aria-pressed={selectMode}
          className={cn(
            'flex h-10 shrink-0 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-medium transition-colors',
            selectMode
              ? 'border-[var(--accent-glow)] bg-[var(--accent-tint)] font-semibold text-[var(--accent)]'
              : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
          title="Select several streams to add at once"
        >
          <ListChecks size={15} />
          {selectMode ? 'Selecting' : 'Select'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {failed ? (
          <Status>Couldn’t reach Twitch. Try again in a moment.</Status>
        ) : streams === null ? (
          <Status>
            <Loader2 size={15} className="animate-spin" /> Loading streams…
          </Status>
        ) : visible.length === 0 ? (
          <Status>
            {q
              ? `No loaded stream matches “${filter.trim()}”.`
              : `No one is live in ${category.name}${language ? ' in this language' : ''} right now.`}
          </Status>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4 gap-y-5">
              {visible.map((s) => (
                <StreamCard
                  key={s.login}
                  stream={s}
                  onWall={onWall.has(s.login)}
                  selectMode={selectMode}
                  selected={selected.has(s.login)}
                  onClick={() => (selectMode ? toggle(s.login) : addStream(s.login))}
                />
              ))}
            </div>
            {cursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--border-default)] text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                Load more
              </button>
            )}
          </>
        )}
      </div>

      {selectMode && (
        <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {selected.size} selected
          </span>
          <button
            onClick={() =>
              setSelected(new Set(visible.filter((s) => !onWall.has(s.login)).map((s) => s.login)))
            }
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Select all
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
          )}
          <button
            onClick={exitSelectMode}
            className="ml-auto h-9 rounded-[10px] border border-[var(--border-default)] px-4 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            onClick={addSelected}
            disabled={selected.size === 0}
            className="flex h-9 items-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add {selected.size || ''} stream{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </section>
  )
}

/**
 * Category browser, as a modal over the wall. Twitch pauses any player that
 * something visible covers, so the streams behind it pause while it is open;
 * the player keep-alive resumes them once it closes.
 */
export function BrowseModal({ onClose }: { onClose: () => void }) {
  const { favorites, isFavorite, toggleFavorite } = useFavoriteCategories()
  const [picked, setPicked] = useState<TwitchCategory | null>(null)
  const [top, setTop] = useState<TwitchCategory[] | null>(null)
  const [topFailed, setTopFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getTopCategories(controller.signal)
      .then(setTop)
      .catch(() => !controller.signal.aborted && setTopFailed(true))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Until the user picks one, open on their first favorite, else the top category.
  const category = picked ?? favorites[0] ?? top?.[0] ?? null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030806]/75 p-4 backdrop-blur-[2px] md:p-8"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Browse categories"
    >
      <div
        className="flex h-full max-h-[772px] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[0_24px_64px_rgba(0,0,0,0.6)] md:flex-row"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <CategoryRail
          favorites={favorites}
          top={top}
          topFailed={topFailed}
          activeId={category?.id}
          onPick={setPicked}
        />
        {category ? (
          <CategoryStreams
            key={category.id}
            category={category}
            favorite={isFavorite(category.id)}
            onToggleFavorite={() => {
              // Pin the view, so un-starring the default favorite doesn't jump away.
              setPicked(category)
              toggleFavorite(category)
            }}
            onClose={onClose}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            {topFailed ? (
              <Status>Couldn’t reach Twitch. Try again in a moment.</Status>
            ) : (
              <Status>
                <Loader2 size={15} className="animate-spin" /> Loading what’s live…
              </Status>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
