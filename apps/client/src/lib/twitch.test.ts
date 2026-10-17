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
  const edge = (login: string | null, viewersCount = 10) => ({
    node: {
      title: 't',
      viewersCount,
      previewImageURL: 'https://x/p.jpg',
      freeformTags: [{ name: 'Français' }],
      broadcaster: login ? { login, displayName: login, profileImageURL: 'a' } : null,
    },
  })
  const page = (edges: ReturnType<typeof edge>[], hasNextPage = true) => ({
    data: { game: { streams: { edges, pageInfo: { hasNextPage } } } },
  })

  /** Answers each request by its sort order; a missing sort fails like a network error. */
  function mockSorts(bySort: Record<string, unknown>) {
    const fn = vi.fn(async (_url: string, init: RequestInit) => {
      const { sort } = JSON.parse(init.body as string).variables
      if (!(sort in bySort)) throw new TypeError('Failed to fetch')
      return new Response(JSON.stringify(bySort[sort]), { status: 200 })
    })
    vi.stubGlobal('fetch', fn)
    return fn
  }

  it('merges every sort order, most watched first, without repeats or banned broadcasters', async () => {
    const fetchMock = mockSorts({
      VIEWER_COUNT: page([edge('top', 900), edge(null), edge('mid', 50)]),
      VIEWER_COUNT_ASC: page([edge('tail', 0), edge('mid', 50)]),
      RECENT: page([edge('new', 3)]),
    })
    const list = await getCategoryStreams('509658', { language: 'fr' })
    expect(list.streams.map((s) => s.login)).toEqual(['top', 'mid', 'new', 'tail'])
    expect(list.streams[0].tags).toEqual(['Français'])
    expect(list.complete).toBe(false)
    const variables = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(init.body as string).variables
    )
    expect(variables.map((v) => v.sort)).toEqual(['VIEWER_COUNT', 'VIEWER_COUNT_ASC', 'RECENT'])
    // Paging needs a token anonymous clients can't get, so no request may carry a cursor.
    expect(variables.every((v) => v.languages[0] === 'FR' && !('after' in v))).toBe(true)
    expect(variables.every((v) => v.tags === null)).toBe(true)
  })

  it('asks Twitch for a tag across the whole category', async () => {
    const fetchMock = mockSorts({ VIEWER_COUNT: page([edge('a')], false) })
    await getCategoryStreams('1', { tag: 'FlashbackWL' })
    const { variables } = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(variables.tags).toEqual(['FlashbackWL'])
  })

  it('is complete once any sort fits on a single page', async () => {
    mockSorts({
      VIEWER_COUNT: page([edge('a')], false),
      VIEWER_COUNT_ASC: page([edge('a')], false),
      RECENT: page([edge('a')], false),
    })
    expect(await getCategoryStreams('1')).toMatchObject({ complete: true })
  })

  it('keeps what the other sorts returned when one fails, and throws when all fail', async () => {
    mockSorts({ VIEWER_COUNT: page([edge('a')]) })
    expect((await getCategoryStreams('1')).streams.map((s) => s.login)).toEqual(['a'])
    mockSorts({})
    await expect(getCategoryStreams('1')).rejects.toThrow('Failed to fetch')
  })
})
