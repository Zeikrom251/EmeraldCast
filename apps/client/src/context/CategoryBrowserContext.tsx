import { createContext, useContext } from 'react'
import type { TwitchCategory } from '@repo/types'

export interface CategoryBrowserContextValue {
  openBrowser: (category?: TwitchCategory) => void
  closeBrowser: () => void
}

export const CategoryBrowserContext = createContext<CategoryBrowserContextValue | null>(null)

export function useCategoryBrowser() {
  const ctx = useContext(CategoryBrowserContext)
  if (!ctx) throw new Error('useCategoryBrowser must be used within CategoryBrowserProvider')
  return ctx
}
