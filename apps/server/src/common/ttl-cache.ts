/**
 * A small in-memory TTL cache with request coalescing.
 *
 * Every Helix call this server makes is an unauthenticated, user-agnostic read
 * (top games, category streams, live status), so identical requests from
 * different visitors can safely share one upstream response. Two things matter
 * for staying under Twitch's rate limit:
 *
 *  - TTL caching, so a popular category is fetched once per window rather than
 *    once per viewer;
 *  - single-flight, so a burst of simultaneous misses on the same key issues
 *    one upstream request instead of N.
 *
 * Failures are deliberately not cached: a rejected factory clears its in-flight
 * entry so the next caller retries rather than inheriting the error.
 */
export class TtlCache {
  private readonly entries = new Map<string, { value: unknown; expiresAt: number }>()
  private readonly inFlight = new Map<string, Promise<unknown>>()

  constructor(
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now
  ) {}

  async wrap<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key)
    if (hit && hit.expiresAt > this.now()) return hit.value as T

    const pending = this.inFlight.get(key)
    if (pending) return pending as Promise<T>

    const request = factory()
      .then((value) => {
        this.set(key, value, ttlMs)
        return value
      })
      .finally(() => {
        this.inFlight.delete(key)
      })

    this.inFlight.set(key, request)
    return request
  }

  get<T>(key: string): T | undefined {
    const hit = this.entries.get(key)
    if (!hit) return undefined
    if (hit.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return hit.value as T
  }

  set(key: string, value: unknown, ttlMs: number): void {
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs })
    if (this.entries.size > this.maxEntries) this.prune()
  }

  delete(key: string): void {
    this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
    this.inFlight.clear()
  }

  get size(): number {
    return this.entries.size
  }

  /**
   * Keys are user-supplied (category ids, search terms), so the map is bounded
   * by dropping expired entries first and then the oldest insertions — Map
   * preserves insertion order, which is a good enough approximation of LRU for
   * a cache whose entries live for seconds.
   */
  private prune(): void {
    const now = this.now()
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key)
    }
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) break
      this.entries.delete(key)
    }
  }
}
