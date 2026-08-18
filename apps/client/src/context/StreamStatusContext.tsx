import { createContext, useContext } from 'react'
import type { StreamStatus } from '@repo/types'

export interface StreamStatusValue {
  /** Latest known status per channel login. Absent means "not checked yet". */
  statuses: Record<string, StreamStatus>
  /** Logins confirmed offline by the most recent poll. */
  offlineChannels: string[]
  /** Forces an immediate refresh (used after the user acts on a stale badge). */
  refresh: () => void
}

export const StreamStatusContext = createContext<StreamStatusValue | null>(null)

export function useStreamStatus() {
  const ctx = useContext(StreamStatusContext)
  if (!ctx) throw new Error('useStreamStatus must be used within StreamStatusProvider')
  return ctx
}
