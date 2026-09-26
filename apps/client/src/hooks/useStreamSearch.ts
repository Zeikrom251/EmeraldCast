import { useState, useEffect } from 'react'
import { searchChannels } from '../lib/twitch'
import type { TwitchSearchResult } from '../types'

export function useStreamSearch(query: string) {
  const [results, setResults] = useState<TwitchSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchChannels(trimmed, controller.signal)
        setResults(data)
        setLoading(false)
      } catch {
        // A superseded query is aborted; only a real failure ends the spinner.
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  return { results, loading }
}
