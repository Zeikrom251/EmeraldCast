import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  Clock,
  Compass,
  Gamepad2,
  Keyboard,
  Layers,
  LayoutGrid,
  MessageSquare,
  PanelRight,
  Plus,
  Share2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { useRecentChannels, useSavedWalls } from '../../hooks/useSavedWalls'
import { useStreamSearch } from '../../hooks/useStreamSearch'
import { buildShareUrl, cn, copyShareUrl, formatViewerCount, parseChannel } from '../../lib/utils'
import { Kbd } from '../Kbd'

interface Item {
  id: string
  section: string
  label: string
  sub?: string
  hint?: string
  Icon: LucideIcon
  /** Channel avatar, shown in place of the icon. */
  image?: string
  live?: boolean
  run: () => void
}

export function CommandPalette({
  onClose,
  onShowShortcuts,
  onBrowse,
}: {
  onClose: () => void
  onShowShortcuts: () => void
  onBrowse: () => void
}) {
  const stream = useStream()
  const { streams, addStream, loadChannels } = stream
  const { mode, setMode, canFocus } = useLayoutMode()
  const recent = useRecentChannels()
  const { walls } = useSavedWalls()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const { results, loading } = useStreamSearch(query)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (text: string) => !q || text.toLowerCase().includes(q)
    const open = new Set(streams.map((s) => s.channel))
    const list: Item[] = []

    const login = parseChannel(query)
    const found = results.filter((r) => !open.has(r.login)).slice(0, 6)
    for (const r of found) {
      list.push({
        id: `search:${r.login}`,
        section: 'Twitch channels',
        label: r.displayName,
        sub: r.isLive
          ? [r.gameName, `${formatViewerCount(r.viewerCount)} viewers`].filter(Boolean).join(' · ')
          : 'Offline',
        image: r.profileImageUrl,
        live: r.isLive,
        Icon: Plus,
        run: () => addStream(r.login),
      })
    }

    // The typed name is always addable, even before (or without) a search hit.
    if (login && !open.has(login) && !found.some((r) => r.login === login)) {
      list.push({
        id: 'add',
        section: 'Add to wall',
        label: `Add “${login}”`,
        sub: loading ? 'Searching Twitch…' : `twitch.tv/${login}`,
        Icon: Plus,
        run: () => addStream(login),
      })
    }

    for (const channel of recent) {
      if (open.has(channel) || channel === login || !matches(channel)) continue
      list.push({
        id: `recent:${channel}`,
        section: 'Recent channels',
        label: channel,
        Icon: Clock,
        run: () => addStream(channel),
      })
    }

    for (const wall of walls) {
      if (!matches(wall.name)) continue
      list.push({
        id: `wall:${wall.id}`,
        section: 'Saved walls',
        label: wall.name,
        sub: `${wall.channels.length} channels · ${wall.channels.slice(0, 3).join(', ')}`,
        Icon: Bookmark,
        run: () => loadChannels(wall.channels, wall.main),
      })
    }

    const actions: Array<Omit<Item, 'section'> | false> =
      streams.length === 0
        ? []
        : [
            canFocus && mode === 'grid'
              ? {
                  id: 'focus',
                  label: 'Switch to focus layout',
                  Icon: PanelRight,
                  run: () => setMode('focus'),
                }
              : mode === 'focus' && {
                  id: 'grid',
                  label: 'Switch to grid layout',
                  Icon: LayoutGrid,
                  run: () => setMode('grid'),
                },
            {
              id: 'chat',
              label: stream.chatOpen ? 'Hide chat' : 'Show chat',
              hint: 'C',
              Icon: MessageSquare,
              run: stream.toggleChat,
            },
            streams.length > 1 && {
              id: 'unified',
              label: stream.chatMode === 'unified' ? 'Show single-channel chat' : 'Merge all chats',
              hint: 'U',
              Icon: Layers,
              run: () => {
                stream.setChatMode(stream.chatMode === 'unified' ? 'channel' : 'unified')
                if (!stream.chatOpen) stream.toggleChat()
              },
            },
            {
              id: 'share',
              label: 'Copy share link',
              Icon: Share2,
              run: () =>
                void copyShareUrl(buildShareUrl(streams, stream.mainId, stream.audioFocusId)),
            },
            {
              id: 'native',
              label: stream.nativeModeAll
                ? 'Switch to EmeraldCast mode'
                : 'Switch to Twitch player mode',
              hint: 'T',
              Icon: Gamepad2,
              run: stream.toggleAllNativeMode,
            },
            { id: 'clear', label: 'Close all streams', Icon: X, run: stream.clearStreams },
          ]
    for (const action of [
      ...actions,
      { id: 'browse', label: 'Browse categories', hint: 'B', Icon: Compass, run: onBrowse },
      { id: 'keys', label: 'Keyboard shortcuts', hint: '?', Icon: Keyboard, run: onShowShortcuts },
    ]) {
      if (action && matches(action.label)) list.push({ ...action, section: 'Actions' })
    }
    return list
  }, [
    query,
    results,
    loading,
    streams,
    recent,
    walls,
    mode,
    canFocus,
    stream,
    addStream,
    loadChannels,
    setMode,
    onShowShortcuts,
    onBrowse,
  ])

  useEffect(() => setActive(0), [query])

  function run(item: Item | undefined) {
    if (!item) return
    onClose()
    item.run()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (items.length ? (i + step + items.length) % items.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(items[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[#030806]/70 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-4">
          <Plus size={18} className="shrink-0 text-[var(--accent)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Channel name, twitch.tv link, saved wall or action…"
            className="min-w-0 flex-1 bg-transparent text-[17px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            role="combobox"
            aria-expanded
            aria-controls="palette-results"
            aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
          />
          <Kbd>esc</Kbd>
        </div>

        <ul
          id="palette-results"
          role="listbox"
          className="max-h-[min(440px,60vh)] overflow-y-auto p-2"
        >
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              Type a channel name to add it.
            </li>
          )}
          {items.map((item, i) => (
            <li key={item.id} role="presentation">
              {item.section !== items[i - 1]?.section && (
                <p className="px-2.5 pb-1 pt-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  {item.section}
                </p>
              )}
              <div
                id={`palette-${item.id}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => run(item)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2',
                  i === active && 'bg-[var(--accent-tint)]'
                )}
              >
                {item.image ? (
                  <span className="relative shrink-0">
                    <img src={item.image} alt="" className="h-7 w-7 rounded-full" loading="lazy" />
                    {item.live && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-elevated)] bg-[var(--live-dot)]" />
                    )}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'rounded-lg p-1.5',
                      i === active
                        ? 'bg-[var(--accent-tint)] text-[var(--accent)]'
                        : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    )}
                  >
                    <item.Icon size={15} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  {item.sub && (
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {item.sub}
                    </span>
                  )}
                </span>
                {item.hint ? <Kbd>{item.hint}</Kbd> : i === active && <Kbd>↵</Kbd>}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            select
          </span>
        </div>
      </div>
    </div>
  )
}
