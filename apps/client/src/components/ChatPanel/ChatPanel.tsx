import { useStream } from '../../context/StreamContext'

export function ChatPanel() {
  const { streams, mainId, chatOpen, chatChannel } = useStream()

  if (!chatOpen || streams.length === 0) return null

  const effectiveMainId =
    streams.length > 1 && mainId && streams.some((s) => s.id === mainId) ? mainId : null
  const isSidebarMode = effectiveMainId !== null

  let displayChannel: string | null =
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
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ width: 320 }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--text-muted)]">Chat</span>
        <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
          {displayChannel}
        </span>
      </div>
      <iframe src={chatSrc} className="w-full flex-1 border-0" title={`${displayChannel} chat`} />
    </div>
  )
}
