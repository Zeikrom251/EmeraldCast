import { memo, useMemo, useState } from 'react'
import {
  Loader2,
  Twitch,
  LogOut,
  RefreshCw,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useFollowing } from '../../context/FollowingContext'
import { useStream } from '../../context/StreamContext'
import { formatViewerCount, cn } from '../../lib/utils'
import type { FollowedChannel } from '@repo/types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const LOGIN_URL = `${API_BASE}/api/twitch/auth/login`

const ChannelCard = memo(function ChannelCard({ ch }: { ch: FollowedChannel }) {
  const { addStream } = useStream()

  return (
    <button
      onClick={() => addStream(ch.broadcasterLogin)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-hover)]',
        !ch.isLive && 'opacity-50'
      )}
      title={ch.isLive ? `${ch.streamTitle} — Add to grid` : 'Offline — Add to grid'}
    >
      <div className="relative shrink-0">
        <img
          src={ch.profileImageUrl}
          alt={ch.broadcasterName}
          className="h-8 w-8 rounded-full object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src =
              `https://static-cdn.jtvnw.net/user-default-pictures-uv/215b7342-def9-11e9-9a66-784f43822e80-profile_image-70x70.png`
          }}
        />
        {ch.isLive && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-surface)] bg-red-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--text-primary)]">
          {ch.broadcasterName}
        </p>
        {ch.isLive ? (
          <div className="flex items-center gap-1">
            <Eye size={9} className="shrink-0 text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatViewerCount(ch.viewerCount)}
            </span>
          </div>
        ) : (
          <p className="text-[10px] text-[var(--text-muted)]">Offline</p>
        )}
      </div>

      {ch.isLive && (
        <span className="shrink-0 rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          Live
        </span>
      )}
    </button>
  )
})

export function FollowingPanel() {
  const { status, username, channels, setConnecting, disconnect } = useFollowing()
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const filtered = useMemo(() => {
    const needle = search.toLowerCase()
    if (!needle) return channels
    return channels.filter(
      (ch) =>
        ch.broadcasterName.toLowerCase().includes(needle) ||
        ch.broadcasterLogin.includes(needle)
    )
  }, [channels, search])

  const liveCount = useMemo(() => channels.filter((c) => c.isLive).length, [channels])

  // An expired session still has a real (if stale) list worth showing.
  const hasChannelList = status === 'connected' || status === 'expired'

  function handleConnect() {
    setConnecting()
    window.location.href = LOGIN_URL
  }

  if (collapsed) {
    return (
      <div className="relative flex h-full w-8 shrink-0 flex-col items-center border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <button
          onClick={() => setCollapsed(false)}
          className="flex w-full items-center justify-center py-2.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          title="Expand following panel"
          aria-label="Expand following panel"
        >
          <ChevronRight size={14} />
        </button>
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <Users size={12} className="text-[var(--text-muted)]" />
          {liveCount > 0 && (
            <span className="rounded-full bg-red-600 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
              {liveCount}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">Following</span>
          {liveCount > 0 && (
            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {liveCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          title="Collapse following panel"
          aria-label="Collapse following panel"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="border-b border-[var(--border-subtle)] px-3 py-2">
        {status === 'idle' && (
          <button
            onClick={handleConnect}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-500"
          >
            <Twitch size={12} />
            Connect with Twitch
          </button>
        )}

        {status === 'connecting' && (
          <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-[var(--text-muted)]">
            <Loader2 size={12} className="animate-spin" />
            Connecting…
          </div>
        )}

        {status === 'connected' && (
          <div className="flex items-center justify-between gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <Twitch size={11} className="shrink-0 text-purple-400" />
              <span className="truncate text-[11px] font-medium text-[var(--text-primary)]">
                @{username}
              </span>
            </div>
            <button
              onClick={disconnect}
              className="shrink-0 rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              title="Disconnect"
              aria-label="Disconnect Twitch account"
            >
              <LogOut size={11} />
            </button>
          </div>
        )}

        {status === 'expired' && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-amber-400">
              Twitch session expired — this list is out of date.
            </p>
            <button
              onClick={handleConnect}
              className="flex items-center justify-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-500"
            >
              <RefreshCw size={11} />
              Reconnect
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-red-400">Connection failed</p>
            <button
              onClick={handleConnect}
              className="flex items-center justify-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-500"
            >
              <RefreshCw size={11} />
              Try again
            </button>
          </div>
        )}
      </div>

      {hasChannelList && channels.length > 0 && (
        <div className="border-b border-[var(--border-subtle)] px-2 py-1.5">
          <input
            type="text"
            placeholder="Filter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1 py-1">
        {hasChannelList && filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
            {search ? 'No matches' : 'No followed channels'}
          </p>
        )}

        {status === 'idle' && (
          <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
            Connect your Twitch account to see who you follow.
          </p>
        )}

        {filtered.map((ch) => (
          <ChannelCard key={ch.broadcasterId} ch={ch} />
        ))}
      </div>
    </div>
  )
}
