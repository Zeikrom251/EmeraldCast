import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { FollowedChannel } from '@repo/types'
import { api } from '../lib/api'
import { FollowingContext, type FollowingState } from './FollowingContext'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function FollowingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FollowingState>({
    status: 'idle',
    username: null,
    channels: [],
  })
  const userTokenRef = useRef<string | null>(null)

  const setConnected = useCallback(
    (username: string, channels: FollowedChannel[], userToken?: string) => {
      if (userToken) userTokenRef.current = userToken
      setState({ status: 'connected', username, channels })
    },
    []
  )

  const setConnecting = useCallback(() => {
    setState((s) => ({ ...s, status: 'connecting' }))
  }, [])

  const setError = useCallback(() => {
    setState((s) => ({ ...s, status: 'error' }))
  }, [])

  const disconnect = useCallback(() => {
    userTokenRef.current = null
    setState({ status: 'idle', username: null, channels: [] })
  }, [])

  useEffect(() => {
    if (state.status !== 'connected') return
    const id = setInterval(async () => {
      const token = userTokenRef.current
      if (!token) return
      try {
        const channels = await api.twitch.followed(token)
        setState((s) => (s.status === 'connected' ? { ...s, channels } : s))
      } catch {
        // silently fail — channel list retains last known state
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [state.status])

  return (
    <FollowingContext.Provider
      value={{ ...state, setConnected, setConnecting, setError, disconnect }}
    >
      {children}
    </FollowingContext.Provider>
  )
}
