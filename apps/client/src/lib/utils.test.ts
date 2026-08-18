import { describe, expect, it } from 'vitest'
import type { StreamSlot } from '@repo/types'
import { buildShareUrl, formatUptime, formatViewerCount } from './utils'

const slot = (id: string, channel: string): StreamSlot => ({ id, channel, nativeMode: false })

describe('formatViewerCount', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatViewerCount(999)).toBe('999')
    expect(formatViewerCount(1_500)).toBe('1.5K')
    expect(formatViewerCount(2_400_000)).toBe('2.4M')
  })
})

describe('formatUptime', () => {
  const now = Date.parse('2026-08-03T12:00:00Z')

  it('shows minutes under an hour', () => {
    expect(formatUptime('2026-08-03T11:23:00Z', now)).toBe('37m')
  })

  it('shows hours and zero-padded minutes past an hour', () => {
    expect(formatUptime('2026-08-03T08:05:00Z', now)).toBe('3h55')
    expect(formatUptime('2026-08-03T11:00:00Z', now)).toBe('1h00')
  })

  it('returns null for missing, unparseable or future timestamps', () => {
    expect(formatUptime(null, now)).toBeNull()
    expect(formatUptime('not a date', now)).toBeNull()
    expect(formatUptime('2026-08-03T12:30:00Z', now)).toBeNull()
  })
})

describe('buildShareUrl', () => {
  it('encodes the channels, the main view and the audio focus', () => {
    const streams = [slot('1', 'a'), slot('2', 'b')]
    const url = new URL(buildShareUrl(streams, '2', '1'))

    expect(url.searchParams.get('streams')).toBe('a,b')
    expect(url.searchParams.get('main')).toBe('b')
    expect(url.searchParams.get('audio')).toBe('a')
  })

  it('omits the audio focus for a single stream, where it is implied', () => {
    const url = new URL(buildShareUrl([slot('1', 'a')], null, '1'))

    expect(url.searchParams.get('streams')).toBe('a')
    expect(url.searchParams.has('audio')).toBe(false)
    expect(url.searchParams.has('main')).toBe(false)
  })

  it('drops ids that no longer match an open stream', () => {
    const url = new URL(buildShareUrl([slot('1', 'a'), slot('2', 'b')], 'gone', 'gone'))
    expect(url.searchParams.has('main')).toBe(false)
    expect(url.searchParams.has('audio')).toBe(false)
  })
})
