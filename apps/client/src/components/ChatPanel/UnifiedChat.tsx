import { memo, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useUnifiedChat } from '../../hooks/useUnifiedChat'
import { emoteUrl, type ChatMessage } from '../../lib/twitchChat'
import { cn } from '../../lib/utils'

/**
 * Stable per-channel accent so a chatter's source is readable at a glance even
 * when several channels are interleaved. Hashing the login keeps the colour the
 * same across sessions and across tabs.
 */
const CHANNEL_COLORS = [
  'text-emerald-300',
  'text-sky-300',
  'text-amber-300',
  'text-fuchsia-300',
  'text-rose-300',
  'text-violet-300',
  'text-lime-300',
  'text-cyan-300',
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
    <div className="px-2 py-[3px] text-xs leading-snug">
      {showChannel && (
        <span className={cn('mr-1.5 font-semibold', channelColor(message.channel))}>
          #{message.channel}
        </span>
      )}
      <span className="font-semibold" style={{ color: message.color ?? 'var(--text-secondary)' }}>
        {message.displayName}
      </span>
      <span className="text-[var(--text-muted)]">: </span>
      <span className="text-[var(--text-primary)]">
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
      </span>
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
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-1">
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
          className="absolute inset-x-2 bottom-2 rounded-md bg-[var(--accent)] py-1 text-[11px] font-semibold text-black shadow-lg"
        >
          Jump to latest
        </button>
      )}
    </div>
  )
}
