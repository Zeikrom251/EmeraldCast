import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { StreamSlot } from '@repo/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Builds a shareable URL that encodes the current streams, the main-view layout,
// and which stream holds audio focus — so a whole multi-view can be restored from a link.
export function buildShareUrl(
  streams: StreamSlot[],
  mainId: string | null,
  audioFocusId: string | null
): string {
  const params = new URLSearchParams()
  params.set('streams', streams.map((s) => s.channel).join(','))

  const mainChannel = streams.find((s) => s.id === mainId)?.channel
  if (mainChannel) params.set('main', mainChannel)

  const audioChannel = streams.find((s) => s.id === audioFocusId)?.channel
  if (audioChannel && streams.length > 1) params.set('audio', audioChannel)

  const { origin, pathname } = window.location
  return `${origin}${pathname}?${params.toString()}`
}

export function formatViewerCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}
