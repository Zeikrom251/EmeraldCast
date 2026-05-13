import { createContext, useContext } from 'react'
import type { FollowedChannel } from '@repo/types'

type ConnectStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface FollowingState {
  status: ConnectStatus
  username: string | null
  channels: FollowedChannel[]
}

export interface FollowingContextValue extends FollowingState {
  setConnected: (username: string, channels: FollowedChannel[], userToken?: string) => void
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
