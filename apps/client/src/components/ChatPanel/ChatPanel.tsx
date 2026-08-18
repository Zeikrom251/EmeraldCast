import { X, MessageSquare, Layers } from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { UnifiedChat } from './UnifiedChat'
import { cn } from '../../lib/utils'

export function ChatPanel() {
  const { streams, mainId, chatOpen, chatChannel, chatMode, toggleChat, setChatMode } = useStream()

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

  const parent = window.location.hostname || 'localhost'
  const chatSrc = `https://www.twitch.tv/embed/${displayChannel}/chat?parent=${parent}&darkpopout`

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ width: 320 }}
    >
      <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] px-2 py-1.5">
        <button
          onClick={() => setChatMode('channel')}
          disabled={!displayChannel}
          className={cn(
            'flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors disabled:opacity-40',
            !unified && displayChannel
              ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
          title={displayChannel ? `${displayChannel} chat` : 'Pick a stream to show its chat'}
        >
          <MessageSquare size={12} className="shrink-0" />
          <span className="truncate font-semibold">{displayChannel ?? 'Channel'}</span>
        </button>

        {/* One channel needs no merging — the embed is strictly better there. */}
        {streams.length > 1 && (
          <button
            onClick={() => setChatMode('unified')}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
              unified
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
            title="Merge every open channel into one feed"
          >
            <Layers size={12} />
            <span className="font-semibold">All</span>
          </button>
        )}

        <button
          onClick={toggleChat}
          className="ml-auto shrink-0 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Close chat"
          aria-label="Close chat"
        >
          <X size={13} />
        </button>
      </div>

      {unified ? (
        <UnifiedChat channels={streams.map((s) => s.channel)} />
      ) : (
        <iframe src={chatSrc} className="w-full flex-1 border-0" title={`${displayChannel} chat`} />
      )}
    </div>
  )
}
