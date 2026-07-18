import { useCallback, useState, type ReactNode } from 'react'
import type { TwitchCategory } from '@repo/types'
import { CategoryBrowser } from '../components/CategoryBrowser'
import { CategoryBrowserContext } from './CategoryBrowserContext'

export function CategoryBrowserProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initialCategory, setInitialCategory] = useState<TwitchCategory | null>(null)

  const openBrowser = useCallback((category?: TwitchCategory) => {
    setInitialCategory(category ?? null)
    setOpen(true)
  }, [])

  const closeBrowser = useCallback(() => setOpen(false), [])

  return (
    <CategoryBrowserContext.Provider value={{ openBrowser, closeBrowser }}>
      {children}
      <CategoryBrowser open={open} initialCategory={initialCategory} onClose={closeBrowser} />
    </CategoryBrowserContext.Provider>
  )
}
