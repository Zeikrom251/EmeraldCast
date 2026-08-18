import { TtlCache } from './ttl-cache'

describe('TtlCache', () => {
  let now = 0
  const clock = () => now

  beforeEach(() => {
    now = 1_000
  })

  it('calls the factory once while the entry is fresh', async () => {
    const cache = new TtlCache(500, clock)
    const factory = jest.fn().mockResolvedValue('value')

    await cache.wrap('k', 1_000, factory)
    now += 999
    const second = await cache.wrap('k', 1_000, factory)

    expect(second).toBe('value')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('refetches once the entry has expired', async () => {
    const cache = new TtlCache(500, clock)
    const factory = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')

    await cache.wrap('k', 1_000, factory)
    now += 1_001

    expect(await cache.wrap('k', 1_000, factory)).toBe('second')
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('coalesces concurrent misses into a single upstream call', async () => {
    const cache = new TtlCache(500, clock)
    let resolve!: (value: string) => void
    const factory = jest.fn().mockReturnValue(
      new Promise<string>((r) => {
        resolve = r
      })
    )

    const calls = [cache.wrap('k', 1_000, factory), cache.wrap('k', 1_000, factory)]
    resolve('shared')

    expect(await Promise.all(calls)).toEqual(['shared', 'shared'])
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('does not cache failures, and lets the next caller retry', async () => {
    const cache = new TtlCache(500, clock)
    const factory = jest
      .fn()
      .mockRejectedValueOnce(new Error('upstream down'))
      .mockResolvedValueOnce('recovered')

    await expect(cache.wrap('k', 1_000, factory)).rejects.toThrow('upstream down')

    expect(await cache.wrap('k', 1_000, factory)).toBe('recovered')
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('keys entries independently', async () => {
    const cache = new TtlCache(500, clock)

    expect(await cache.wrap('a', 1_000, async () => 'A')).toBe('A')
    expect(await cache.wrap('b', 1_000, async () => 'B')).toBe('B')
    expect(await cache.wrap('a', 1_000, async () => 'other')).toBe('A')
  })

  it('treats an expired entry as absent on a direct read', () => {
    const cache = new TtlCache(500, clock)
    cache.set('k', 'value', 100)

    expect(cache.get('k')).toBe('value')
    now += 101
    expect(cache.get('k')).toBeUndefined()
  })

  it('stays bounded when many distinct keys are cached', () => {
    const cache = new TtlCache(10, clock)
    for (let i = 0; i < 50; i += 1) cache.set(`k${i}`, i, 10_000)

    expect(cache.size).toBeLessThanOrEqual(10)
    // Pruning drops the oldest insertions, so the most recent key survives.
    expect(cache.get('k49')).toBe(49)
  })
})
