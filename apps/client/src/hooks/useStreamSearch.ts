import { useState, useEffect } from 'react'
import axios from 'axios'
import { api } from '../lib/api'
import type { TwitchSearchResult } from '@repo/types'

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
        const data = await api.twitch.search(trimmed, controller.signal)
        setResults(data)
        setLoading(false)
      } catch (err) {
        if (!axios.isCancel(err)) setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  return { results, loading }
}
