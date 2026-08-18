import { createContext, useContext } from 'react'
import type { FollowedChannel } from '@repo/types'

/**
 * `expired` is distinct from `error`: the connection worked and the channel list
 * on screen is real, but the Twitch credentials can no longer be refreshed, so
 * the list is frozen until the user reconnects.
 */
type ConnectStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'expired'

export interface FollowingState {
  status: ConnectStatus
  username: string | null
  channels: FollowedChannel[]
}

export interface FollowingContextValue extends FollowingState {
  setConnected: (
    username: string,
    channels: FollowedChannel[],
    userToken?: string,
    refreshToken?: string
  ) => void
  setConnecting: () => void
  setError: () => void
  disconnect: () => void
}

export const FollowingContext = createContext<FollowingContextValue | null>(null)

export function useFollowing() {
  const ctx = useContext(FollowingContext)
  if (!ctx) throw new Error('useFollowing must be used within FollowingProvider')
  return ctx
}
