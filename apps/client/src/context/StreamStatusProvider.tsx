import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { StreamStatus } from '@repo/types'
import { api } from '../lib/api'
import { useStream } from './StreamContext'
import { StreamStatusContext } from './StreamStatusContext'

const POLL_INTERVAL_MS = 60_000

/**
 * Keeps live state for the channels currently on the grid.
 *
 * The Twitch embed gives no usable signal when a broadcast ends — the iframe
 * just sits on a stale frame or an offline card — so the surrounding UI polls
 * Helix instead. Polling is paused while the tab is hidden and resumes with an
 * immediate refresh on the way back, since that is exactly when the cached
 * state is most likely to be wrong.
 */
export function StreamStatusProvider({ children }: { children: ReactNode }) {
  const { streams } = useStream()
  const [statuses, setStatuses] = useState<Record<string, StreamStatus>>({})

  // A stable, order-independent identity for "which channels are open", so
  // reordering the grid does not restart the poll.
  const loginKey = useMemo(
    () => [...new Set(streams.map((s) => s.channel))].sort().join(','),
    [streams]
  )

  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!loginKey) {
      setStatuses({})
      return
    }

    const logins = loginKey.split(',')
    let disposed = false
    let inFlight: AbortController | null = null

    async function poll() {
      inFlight?.abort()
      const controller = new AbortController()
      inFlight = controller
      try {
        const results = await api.twitch.streamStatus(logins, controller.signal)
        if (disposed || controller.signal.aborted) return
        setStatuses(Object.fromEntries(results.map((s) => [s.login, s])))
      } catch {
        // Network hiccup or an aborted poll — keep the last known state rather
        // than flashing every tile to "offline".
      }
    }

    refreshRef.current = poll
    void poll()

    const timer = window.setInterval(() => {
      if (!document.hidden) void poll()
    }, POLL_INTERVAL_MS)

    function onVisibilityChange() {
      if (!document.hidden) void poll()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      disposed = true
      inFlight?.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      refreshRef.current = () => {}
    }
  }, [loginKey])

  const refresh = useCallback(() => refreshRef.current(), [])

  const offlineChannels = useMemo(
    () =>
      [...new Set(streams.map((s) => s.channel))].filter(
        (channel) => statuses[channel]?.isLive === false
      ),
    [streams, statuses]
  )

  const value = useMemo(
    () => ({ statuses, offlineChannels, refresh }),
    [statuses, offlineChannels, refresh]
  )

  return <StreamStatusContext.Provider value={value}>{children}</StreamStatusContext.Provider>
}
