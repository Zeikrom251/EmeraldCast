import type { StreamSlot } from '@repo/types'

const STREAMS_KEY = 'emeraldcast:streams'

export function getActiveStreams(): StreamSlot[] {
  try {
    const raw = localStorage.getItem(STREAMS_KEY)
    return raw ? (JSON.parse(raw) as StreamSlot[]) : []
  } catch {
    return []
  }
}

export function saveActiveStreams(streams: StreamSlot[]): void {
  localStorage.setItem(STREAMS_KEY, JSON.stringify(streams))
}
