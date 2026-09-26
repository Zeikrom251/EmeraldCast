import { memo, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useUnifiedChat } from '../../hooks/useUnifiedChat'
import { emoteUrl, type ChatMessage } from '../../lib/twitchChat'

/**
 * Stable per-channel accent so a chatter's source is readable at a glance even
 * when several channels are interleaved. Hashing the login keeps the colour the
 * same across sessions and across tabs.
 */
const CHANNEL_COLORS = [
  '#2ee59d',
  '#7aa2ff',
  '#ff9f45',
  '#e879f9',
  '#ff8fa3',
  '#c3a6ff',
  '#9ef01a',
  '#67e8f9',
]

function channelColor(channel: string): string {
  let hash = 0
  for (let i = 0; i < channel.length; i += 1) {
    hash = (hash * 31 + channel.charCodeAt(i)) | 0
  }
  return CHANNEL_COLORS[Math.abs(hash) % CHANNEL_COLORS.length]
}

const ChatLine = memo(function ChatLine({
  message,
  showChannel,
}: {
  message: ChatMessage
  showChannel: boolean
}) {
  return (
    <div className="flex gap-2.5 px-3.5 py-1.5">
      {showChannel && (
        <span
          className="w-[3px] shrink-0 rounded-full"
          style={{ background: channelColor(message.channel) }}
          title={message.channel}
        />
      )}
      <div className="min-w-0 text-[13px] leading-[18px]">
        <div className="flex items-baseline gap-1.5">
          <span
            className="truncate text-xs font-semibold"
            style={{ color: message.color ?? 'var(--text-secondary)' }}
          >
            {message.displayName}
          </span>
          {showChannel && (
            <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
              {message.channel}
            </span>
          )}
        </div>
        <p className="break-words text-[var(--text-secondary)]">
          {message.fragments.map((fragment, index) =>
            fragment.type === 'text' ? (
              <span key={index}>{fragment.value}</span>
            ) : (
              <img
                key={index}
                src={emoteUrl(fragment.id)}
                alt={fragment.alt}
                title={fragment.alt}
                className="mx-0.5 inline-block h-5 w-auto align-middle"
                loading="lazy"
              />
            )
          )}
        </p>
      </div>
    </div>
  )
})

export function UnifiedChat({ channels }: { channels: string[] }) {
  const { messages, status } = useUnifiedChat(channels, true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)

  // Follow new messages only while the user is already at the bottom, so
  // scrolling back through history is not yanked away by the next message.
  useEffect(() => {
    if (!pinned) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, pinned])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setPinned(distanceFromBottom < 40)
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center gap-1.5 px-3 py-6 text-center text-[11px] text-[var(--text-muted)]">
            {status === 'connected' ? (
              'Waiting for messages…'
            ) : (
              <>
                <Loader2 size={11} className="animate-spin" />
                Connecting to chat…
              </>
            )}
          </div>
        )}
        {messages.map((message) => (
          <ChatLine key={message.id} message={message} showChannel={channels.length > 1} />
        ))}
      </div>

      {!pinned && (
        <button
          onClick={() => setPinned(true)}
          className="absolute inset-x-3 bottom-3 rounded-[10px] bg-[var(--accent)] py-1.5 text-xs font-semibold text-[var(--accent-ink)] shadow-lg"
        >
          Jump to latest
        </button>
      )}
    </div>
  )
}
