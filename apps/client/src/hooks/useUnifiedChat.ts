import { useEffect, useRef, useState } from 'react'
import { TwitchChatClient, type ChatMessage, type ChatStatus } from '../lib/twitchChat'

/** Chat scrolls away fast; keeping more than this only costs memory. */
const MAX_MESSAGES = 300

/**
 * Messages arrive far faster than a UI needs to repaint in a busy channel, so
 * they are buffered and flushed on a fixed cadence instead of causing a render
 * each.
 */
const FLUSH_INTERVAL_MS = 250

/**
 * Subscribes to the merged chat of several channels.
 *
 * The connection is opened once while `enabled` and follows channel changes
 * with JOIN/PART, so adding a stream to the grid does not tear down the feed.
 */
export function useUnifiedChat(channels: string[], enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('disconnected')
  const clientRef = useRef<TwitchChatClient | null>(null)
  const bufferRef = useRef<ChatMessage[]>([])

  const channelKey = [...new Set(channels.map((c) => c.toLowerCase()))].sort().join(',')

  useEffect(() => {
    if (!enabled) {
      setMessages([])
      setStatus('disconnected')
      return
    }

    const client = new TwitchChatClient({
      onMessage: (message) => bufferRef.current.push(message),
      onStatus: setStatus,
    })
    clientRef.current = client
    client.connect()

    const flush = window.setInterval(() => {
      if (bufferRef.current.length === 0) return
      const incoming = bufferRef.current
      bufferRef.current = []
      setMessages((prev) => [...prev, ...incoming].slice(-MAX_MESSAGES))
    }, FLUSH_INTERVAL_MS)

    return () => {
      window.clearInterval(flush)
      client.close()
      clientRef.current = null
      bufferRef.current = []
    }
  }, [enabled])

  useEffect(() => {
    clientRef.current?.setChannels(channelKey ? channelKey.split(',') : [])
  }, [channelKey, enabled])

  return { messages, status }
}
