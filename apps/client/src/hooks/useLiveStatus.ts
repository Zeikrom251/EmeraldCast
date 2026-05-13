import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { TwitchStream } from '@repo/types'

export function useLiveStatus(channels: string[]) {
  const [streams, setStreams] = useState<TwitchStream[]>([])

  useEffect(() => {
    if (channels.length === 0) {
      setStreams([])
      return
    }

    let cancelled = false

    const fetch = async () => {
      try {
        const data = await api.twitch.streams(channels)
        if (!cancelled) setStreams(data)
      } catch {
        // silently fail — stream embeds will still work
      }
    }

    fetch()
    const interval = setInterval(fetch, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [channels.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return streams
}
