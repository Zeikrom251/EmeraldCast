import { X, MessageSquare } from 'lucide-react'
import { useStream } from '../../context/StreamContext'

export function ChatPanel() {
  const { streams, mainId, chatOpen, chatChannel, toggleChat } = useStream()

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

  if (!displayChannel) return null

  const parent = window.location.hostname || 'localhost'
  const chatSrc = `https://www.twitch.tv/embed/${displayChannel}/chat?parent=${parent}&darkpopout`

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ width: 320 }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
        <MessageSquare size={13} className="shrink-0 text-[var(--accent)]" />
        <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
          {displayChannel}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">chat</span>
        <button
          onClick={toggleChat}
          className="ml-auto shrink-0 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Close chat"
          aria-label="Close chat"
        >
          <X size={13} />
        </button>
      </div>
      <iframe src={chatSrc} className="w-full flex-1 border-0" title={`${displayChannel} chat`} />
    </div>
  )
}
