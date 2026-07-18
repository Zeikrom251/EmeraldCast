import type { StreamSlot, TwitchCategory, StreamCollection } from '@repo/types'

const STREAMS_KEY = 'emeraldcast:streams'
const FAVORITE_CATEGORIES_KEY = 'emeraldcast:favorite-categories'
const COLLECTIONS_KEY = 'emeraldcast:collections'

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
