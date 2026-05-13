import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import type { TwitchSearchResult } from '@repo/types'

export function useStreamSearch(query: string) {
  const [results, setResults] = useState<TwitchSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        const data = await api.twitch.search(trimmed)
        setResults(data)
      } catch (err) {
        if ((err as Error).name !== 'CanceledError') {
          setError('Search failed')
        }
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      abortRef.current?.abort()
    }
  }, [query])

  return { results, loading, error }
}
