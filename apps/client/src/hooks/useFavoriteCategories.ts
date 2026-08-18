import { useCallback, useState } from 'react'
import { getFavoriteCategories, saveFavoriteCategories, STORAGE_KEYS } from '@repo/utils'
import type { TwitchCategory } from '@repo/types'
import { useStorageSync } from './useStorageSync'

export function useFavoriteCategories() {
  const [favorites, setFavorites] = useState<TwitchCategory[]>(() => getFavoriteCategories())

  useStorageSync(STORAGE_KEYS.favoriteCategories, getFavoriteCategories, setFavorites)

  const isFavorite = useCallback(
    (id: string) => favorites.some((c) => c.id === id),
    [favorites]
  )

  const toggleFavorite = useCallback((category: TwitchCategory) => {
    setFavorites((prev) => {
      const exists = prev.some((c) => c.id === category.id)
      const next = exists
        ? prev.filter((c) => c.id !== category.id)
        : [...prev, { id: category.id, name: category.name, boxArtUrl: category.boxArtUrl }]
      saveFavoriteCategories(next)
      return next
    })
  }, [])

  return { favorites, isFavorite, toggleFavorite }
}
