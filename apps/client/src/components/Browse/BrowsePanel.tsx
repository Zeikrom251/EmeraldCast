import { useEffect, useState } from 'react'
import {
  Check,
  ChevronLeft,
  Compass,
  Eye,
  Filter,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { useFavoriteCategories } from '../../hooks/useFavoriteCategories'
import { getCategoryStreams, getTopCategories, searchCategories } from '../../lib/twitch'
import { cn, formatViewerCount } from '../../lib/utils'
import type { CategoryStream, TwitchCategory } from '../../types'
import { LanguageSelect } from './LanguageSelect'

const iconBtn =
  'rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
const input =
  'flex h-10 items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
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

function CategoryCard({
  category,
  favorite,
  onPick,
  onToggleFavorite,
}: {
  category: TwitchCategory
  favorite: boolean
  onPick: () => void
  onToggleFavorite: () => void
}) {
  return (
    <div className="group relative min-w-0">
      <button onClick={onPick} className="block w-full text-left" title={`Browse ${category.name}`}>
        <img
          src={category.boxArtUrl}
          alt=""
          loading="lazy"
          className="aspect-[3/4] w-full rounded-[10px] bg-[var(--bg-elevated)] object-cover outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] transition group-hover:outline-2 group-hover:outline-[var(--accent)]"
        />
        <span className="mt-1.5 block truncate text-xs font-medium text-[var(--text-primary)]">
          {category.name}
        </span>
        {category.viewerCount !== undefined && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--live-dot)]" />
            {formatViewerCount(category.viewerCount)}
          </span>
        )}
      </button>
      <button
        onClick={onToggleFavorite}
        className={cn(
          'absolute right-1.5 top-1.5 rounded-[7px] bg-[#050807]/60 p-1.5 backdrop-blur-md transition-opacity',
          favorite
            ? 'text-[#ffd166]'
            : 'text-white opacity-0 focus:opacity-100 group-hover:opacity-100'
        )}
        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={favorite}
      >
        <Star size={13} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

function CategoryGrid({
  categories,
  onPick,
}: {
  categories: TwitchCategory[]
  onPick: (category: TwitchCategory) => void
}) {
  const { isFavorite, toggleFavorite } = useFavoriteCategories()
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
      {categories.map((c) => (
        <CategoryCard
          key={c.id}
          category={c}
          favorite={isFavorite(c.id)}
          onPick={() => onPick(c)}
          onToggleFavorite={() => toggleFavorite(c)}
        />
      ))}
    </div>
  )
}

function CategoryList({
  onPick,
  onClose,
}: {
  onPick: (category: TwitchCategory) => void
  onClose: () => void
}) {
  const { favorites } = useFavoriteCategories()
  const [query, setQuery] = useState('')
  const [top, setTop] = useState<TwitchCategory[] | null>(null)
  const [results, setResults] = useState<TwitchCategory[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getTopCategories(controller.signal)
      .then(setTop)
      .catch(() => !controller.signal.aborted && setFailed(true))
    return () => controller.abort()
  }, [])

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
    <>
      <div className="flex items-center gap-2.5 px-[18px] pb-3 pt-3.5">
        <Compass size={16} className="text-[var(--accent)]" />
        <h2 className="flex-1 font-display text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
          Browse categories
        </h2>
        <button onClick={onClose} className={iconBtn} aria-label="Close browser">
          <X size={15} />
        </button>
      </div>
      <div className="px-[18px] pb-4">
        <label className={input}>
          <Search size={16} className="shrink-0 text-[var(--text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories: Just Chatting, GTA V…"
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

      <div className="flex-1 space-y-6 overflow-y-auto px-[18px] pb-[18px]">
        {query.trim() ? (
          results === null ? (
            <Status>
              <Loader2 size={15} className="animate-spin" /> Searching…
            </Status>
          ) : results.length === 0 ? (
            <Status>No category matches “{query.trim()}”.</Status>
          ) : (
            <CategoryGrid categories={results} onPick={onPick} />
          )
        ) : (
          <>
            {favorites.length > 0 && (
              <section>
                <SectionLabel>
                  <Star size={12} className="text-[#ffd166]" fill="currentColor" /> Favorites
                </SectionLabel>
                <CategoryGrid categories={favorites} onPick={onPick} />
              </section>
            )}
            <section>
              <SectionLabel>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Top categories
              </SectionLabel>
              {failed ? (
                <Status>Couldn’t reach Twitch. Try again in a moment.</Status>
              ) : top === null ? (
                <Status>
                  <Loader2 size={15} className="animate-spin" /> Loading what’s live…
                </Status>
              ) : (
                <CategoryGrid categories={top} onPick={onPick} />
              )}
            </section>
          </>
        )}
      </div>
    </>
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
              'absolute right-2 top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full',
              selected
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'border border-white/70 bg-[#050807]/60 text-transparent'
            )}
          >
            <Check size={14} strokeWidth={3} />
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
  onBack,
  onClose,
}: {
  category: TwitchCategory
  onBack: () => void
  onClose: () => void
}) {
  const { streams: wall, addStream, addStreams } = useStream()
  const { isFavorite, toggleFavorite } = useFavoriteCategories()
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

  function addSelected() {
    addStreams([...selected])
    setSelected(new Set())
    setSelectMode(false)
  }

  const favorite = isFavorite(category.id)

  return (
    <>
      <div className="flex items-center gap-2.5 px-3.5 pb-3 pt-3.5">
        <button
          onClick={onBack}
          className={cn(iconBtn, 'bg-[var(--bg-hover)]')}
          aria-label="Back to categories"
        >
          <ChevronLeft size={15} />
        </button>
        <img src={category.boxArtUrl} alt="" className="h-10 w-[30px] rounded-md object-cover" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
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
          onClick={() => toggleFavorite(category)}
          className={cn(iconBtn, favorite && 'text-[#ffd166] hover:text-[#ffd166]')}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
        >
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={onClose} className={iconBtn} aria-label="Close browser">
          <X size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-[18px] pb-3.5">
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
          onClick={() => {
            setSelectMode((on) => !on)
            setSelected(new Set())
          }}
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

      <div className="flex-1 overflow-y-auto px-[18px] pb-[18px]">
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-x-[18px] gap-y-4">
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
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--border-default)] text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                Load more
              </button>
            )}
          </>
        )}
      </div>

      {selectMode && (
        <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-[18px] py-3">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">
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
            onClick={addSelected}
            disabled={selected.size === 0}
            className="ml-auto flex h-[38px] items-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add {selected.size || ''} stream{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </>
  )
}

/**
 * Category browser. It sits beside the wall instead of over it: Twitch pauses
 * any player that something visible covers, so a modal would freeze every
 * stream for as long as it stayed open.
 */
export function BrowsePanel({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<TwitchCategory | null>(null)

  return (
    <aside
      className="flex w-[606px] max-w-[50vw] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      aria-label="Browse categories"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return
        if (category) setCategory(null)
        else onClose()
      }}
    >
      {category ? (
        <CategoryStreams category={category} onBack={() => setCategory(null)} onClose={onClose} />
      ) : (
        <CategoryList onPick={setCategory} onClose={onClose} />
      )}
    </aside>
  )
}
