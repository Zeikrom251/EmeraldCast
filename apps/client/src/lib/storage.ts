import type { StreamSlot, StreamCollection, TwitchCategory } from '../types'

const STREAMS_KEY = 'emeraldcast:streams'
const COLLECTIONS_KEY = 'emeraldcast:collections'
const FAVORITE_CATEGORIES_KEY = 'emeraldcast:favorite-categories'
const RECENT_KEY = 'emeraldcast:recent-channels'
const RECENT_LIMIT = 12

export const STORAGE_KEYS = {
  streams: STREAMS_KEY,
  collections: COLLECTIONS_KEY,
  favoriteCategories: FAVORITE_CATEGORIES_KEY,
  recent: RECENT_KEY,
} as const

/**
 * Calls `onChange` when another tab writes `key`.
 *
 * The `storage` event only fires in *other* documents, so this never echoes a
 * tab's own writes. A null `event.key` means the whole store was cleared, which
 * affects every key and therefore also notifies.
 */
export function subscribeToStorage(key: string, onChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== key) return
    onChange()
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

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

export function getCollections(): StreamCollection[] {
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY)
    return raw ? (JSON.parse(raw) as StreamCollection[]) : []
  } catch {
    return []
  }
}

export function saveCollections(collections: StreamCollection[]): void {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections))
}

export function getRecentChannels(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** Moves `channels` to the front of the recent list, most recent first. */
export function pushRecentChannels(channels: string[]): void {
  if (channels.length === 0) return
  const next = [...channels, ...getRecentChannels().filter((c) => !channels.includes(c))]
  localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_LIMIT)))
}

export function getFavoriteCategories(): TwitchCategory[] {
  try {
    const raw = localStorage.getItem(FAVORITE_CATEGORIES_KEY)
    return raw ? (JSON.parse(raw) as TwitchCategory[]) : []
  } catch {
    return []
  }
}

export function saveFavoriteCategories(categories: TwitchCategory[]): void {
  localStorage.setItem(FAVORITE_CATEGORIES_KEY, JSON.stringify(categories))
}
