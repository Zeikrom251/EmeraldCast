import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCategoryStreams, getStreamStatuses, searchChannels } from './twitch'

function mockGql(data: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ data }), { status: 200 }))
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('twitch gql', () => {
  it('maps search results and skips non-user items', async () => {
    mockGql({
      searchFor: {
        channels: {
          edges: [
            {
              item: {
                login: 'kaicenat',
                displayName: 'KaiCenat',
                profileImageURL: 'https://x/p.png',
                broadcastSettings: { title: 'hi' },
                stream: { viewersCount: 1200, game: { displayName: 'Just Chatting' } },
              },
            },
            { item: { login: 'offline_one', stream: null } },
            { item: null },
          ],
        },
      },
    })
    const results = await searchChannels('kai')
    expect(results).toEqual([
      {
        login: 'kaicenat',
        displayName: 'KaiCenat',
        profileImageUrl: 'https://x/p.png',
        isLive: true,
        title: 'hi',
        viewerCount: 1200,
        gameName: 'Just Chatting',
      },
      {
        login: 'offline_one',
        displayName: 'offline_one',
        profileImageUrl: '',
        isLive: false,
        title: '',
        viewerCount: 0,
        gameName: '',
      },
    ])
  })

  it('maps statuses and drops unknown logins', async () => {
    mockGql({
      users: [
        { login: 'shroud', stream: null, broadcastSettings: { title: 't' } },
        { login: 'live', stream: { viewersCount: 5, createdAt: '2026-01-01T00:00:00Z' } },
        null,
      ],
    })
    const statuses = await getStreamStatuses(['shroud', 'live', 'nobody'])
    expect(statuses.map((s) => [s.login, s.isLive, s.startedAt])).toEqual([
      ['shroud', false, null],
      ['live', true, '2026-01-01T00:00:00Z'],
    ])
  })

  it('throws on an HTTP error so callers keep their last state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 }))
    )
    await expect(getStreamStatuses(['a'])).rejects.toThrow('500')
  })
})

describe('getCategoryStreams', () => {
  const edge = (login: string | null, cursor: string) => ({
    cursor,
    node: {
      title: 't',
      viewersCount: 10,
      previewImageURL: 'https://x/p.jpg',
      freeformTags: [{ name: 'Français' }],
      broadcaster: login ? { login, displayName: login, profileImageURL: 'a' } : null,
    },
  })

  it('returns the last cursor only when another page exists, skipping banned broadcasters', async () => {
    mockGql({
      game: {
        streams: {
          edges: [edge('a', 'c1'), edge(null, 'c2'), edge('b', 'c3')],
          pageInfo: { hasNextPage: true },
        },
      },
    })
    const page = await getCategoryStreams('509658', { language: 'fr' })
    expect(page.streams.map((s) => s.login)).toEqual(['a', 'b'])
    expect(page.streams[0].tags).toEqual(['Français'])
    expect(page.cursor).toBe('c3')
    const body = JSON.parse(
      (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1]
        .body as string
    )
    expect(body.variables.languages).toEqual(['FR'])
  })

  it('has no cursor on the last page', async () => {
    mockGql({ game: { streams: { edges: [edge('a', 'c1')], pageInfo: { hasNextPage: false } } } })
    expect((await getCategoryStreams('1')).cursor).toBeNull()
  })
})
