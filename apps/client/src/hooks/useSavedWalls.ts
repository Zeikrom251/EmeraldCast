import { useState } from 'react'
import { getCollections, getRecentChannels, saveCollections, STORAGE_KEYS } from '../lib/storage'
import type { StreamCollection } from '../types'
import { useStorageSync } from './useStorageSync'

/** Saved walls (stored as "collections"), kept in step with other tabs. */
export function useSavedWalls() {
  const [walls, setWalls] = useState<StreamCollection[]>(getCollections)
  useStorageSync(STORAGE_KEYS.collections, getCollections, setWalls)

  function persist(next: StreamCollection[]) {
    setWalls(next)
    saveCollections(next)
  }

  return {
    walls,
    save: (name: string, channels: string[], main: string | null) =>
      persist([...getCollections(), { id: crypto.randomUUID(), name, channels, main }]),
    remove: (id: string) => persist(walls.filter((w) => w.id !== id)),
  }
}

export function useRecentChannels() {
  const [recent, setRecent] = useState<string[]>(getRecentChannels)
  useStorageSync(STORAGE_KEYS.recent, getRecentChannels, setRecent)
  return recent
}
