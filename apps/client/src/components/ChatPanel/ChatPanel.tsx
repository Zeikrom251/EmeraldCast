import { X, MessageSquare, Layers, ExternalLink } from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { UnifiedChat } from './UnifiedChat'
import { cn } from '../../lib/utils'

export function ChatPanel() {
  const {
    streams,
    mainId,
    audioFocusId,
    chatOpen,
    chatChannel,
    chatMode,
    toggleChat,
    setChatMode,
  } = useStream()

  if (!chatOpen || streams.length === 0) return null

  const effectiveMainId =
    streams.length > 1 && mainId && streams.some((s) => s.id === mainId) ? mainId : null
  const isSidebarMode = effectiveMainId !== null

  const displayChannel: string | null =
    streams.length === 1
      ? streams[0].channel
      : chatChannel && streams.some((s) => s.channel === chatChannel)
        ? chatChannel
        : isSidebarMode
          ? streams.find((s) => s.id === effectiveMainId)!.channel
          : null

  // With a single stream there is nothing to merge, so the richer Twitch embed
  // wins regardless of the remembered mode.
  const unified = chatMode === 'unified' && streams.length > 1
  if (!displayChannel && !unified) return null

  // Where "chat in…" sends you from the merged feed: the stream you're listening to.
  const talkChannel =
    streams.find((s) => s.id === audioFocusId)?.channel ?? displayChannel ?? streams[0].channel

  const parent = window.location.hostname || 'localhost'
  const chatSrc = `https://www.twitch.tv/embed/${displayChannel}/chat?parent=${parent}&darkpopout`

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ width: 340 }}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle)] p-2.5">
        <button
          onClick={() => setChatMode('channel')}
          disabled={!displayChannel}
          className={cn(
            'flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40',
            !unified && displayChannel
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
          title={displayChannel ? `${displayChannel} chat` : 'Pick a stream to show its chat'}
        >
          <MessageSquare size={13} className="shrink-0 text-[var(--accent)]" />
          <span className="truncate font-semibold">{displayChannel ?? 'Channel'}</span>
        </button>

        {/* One channel needs no merging; the embed is strictly better there. */}
        {streams.length > 1 && (
          <button
            onClick={() => setChatMode('unified')}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
              unified
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
            title="Merge every open channel into one feed"
          >
            <Layers size={13} className="text-[var(--accent)]" />
            <span className="font-semibold">All</span>
          </button>
        )}

        <button
          onClick={toggleChat}
          className="ml-auto shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Close chat"
          aria-label="Close chat"
        >
          <X size={13} />
        </button>
      </div>

      {unified ? (
        <>
          <UnifiedChat channels={streams.map((s) => s.channel)} />
          <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] p-3">
            <p className="text-center text-xs text-[var(--text-muted)]">
              The merged feed is read-only.
            </p>
            <a
              href={`https://www.twitch.tv/popout/${talkChannel}/chat`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center justify-center gap-2 rounded-[10px] bg-[var(--accent-tint)] text-[13px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-glow)]"
            >
              <span className="truncate">Chat in {talkChannel}</span>
              <ExternalLink size={14} className="shrink-0" />
            </a>
          </div>
        </>
      ) : (
        <iframe src={chatSrc} className="w-full flex-1 border-0" title={`${displayChannel} chat`} />
      )}
    </div>
  )
}
