import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import axios from 'axios'
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
  const refreshTokenRef = useRef<string | null>(null)

  const setConnected = useCallback(
    (username: string, channels: FollowedChannel[], userToken?: string, refreshToken?: string) => {
      if (userToken) userTokenRef.current = userToken
      if (refreshToken) refreshTokenRef.current = refreshToken
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
    refreshTokenRef.current = null
    setState({ status: 'idle', username: null, channels: [] })
  }, [])

  // Twitch user access tokens last about four hours, so any long session will
  // outlive its credentials. The server rotates them using the refresh token and
  // returns the new pair alongside the channels; when even that fails there is
  // nothing left to retry with, so the panel switches to `expired` instead of
  // quietly serving a list that can never update again.
  useEffect(() => {
    if (state.status !== 'connected') return

    const id = setInterval(async () => {
      const token = userTokenRef.current
      if (!token) return
      try {
        const res = await api.twitch.followed(token, refreshTokenRef.current ?? undefined)
        if (res.userToken) userTokenRef.current = res.userToken
        if (res.refreshToken) refreshTokenRef.current = res.refreshToken
        setState((s) => (s.status === 'connected' ? { ...s, channels: res.channels } : s))
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setState((s) => (s.status === 'connected' ? { ...s, status: 'expired' } : s))
        }
        // Anything else is transient — keep the last known list and let the next
        // tick retry.
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
