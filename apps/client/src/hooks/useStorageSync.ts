import { useEffect, useRef } from 'react'
import { subscribeToStorage } from '@repo/utils'

/**
 * Keeps local state in step with a localStorage key another tab may write.
 *
 * `read` and `apply` are held in refs so callers can pass inline closures
 * without re-subscribing on every render.
 */
export function useStorageSync<T>(key: string, read: () => T, apply: (value: T) => void): void {
  const readRef = useRef(read)
  const applyRef = useRef(apply)
  readRef.current = read
  applyRef.current = apply

  useEffect(() => subscribeToStorage(key, () => applyRef.current(readRef.current())), [key])
}
