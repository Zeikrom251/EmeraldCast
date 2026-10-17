import type {
  CategoryStream,
  CategoryStreamList,
  StreamStatus,
  TwitchCategory,
  TwitchSearchResult,
} from '../types'

/**
 * Twitch's public GraphQL endpoint, the one twitch.tv itself calls, with the
 * web client's public Client-ID. It needs no secret and no login, which is what
 * lets EmeraldCast run without a backend. It is unofficial and undocumented:
 * if Twitch changes it, search and live status stop working while the players
 * and chat (official embeds) keep going.
 */
const GQL_URL = 'https://gql.twitch.tv/gql'
const WEB_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'

interface GqlUser {
  login: string
  displayName?: string
  profileImageURL?: string
  broadcastSettings?: { title: string } | null
  stream: { viewersCount: number; createdAt?: string; game?: { displayName: string } | null } | null
}

async function gql<T>(query: string, variables: object, signal?: AbortSignal): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Client-ID': WEB_CLIENT_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  })
  if (!res.ok) throw new Error(`Twitch GQL ${res.status}`)
  const body = (await res.json()) as { data?: T; errors?: unknown[] }
  if (!body.data) throw new Error('Twitch GQL returned no data')
  return body.data
}

const SEARCH_QUERY = `query($q: String!) {
  searchFor(userQuery: $q, platform: "web") {
    channels { edges { item { ... on User {
      login displayName profileImageURL(width: 70)
      broadcastSettings { title }
      stream { viewersCount game { displayName } }
    } } } }
  }
}`

export async function searchChannels(
  query: string,
  signal?: AbortSignal
): Promise<TwitchSearchResult[]> {
  const data = await gql<{ searchFor: { channels: { edges: { item: GqlUser | null }[] } } | null }>(
    SEARCH_QUERY,
    { q: query },
    signal
  )
  return (data.searchFor?.channels.edges ?? [])
    .map((edge) => edge.item)
    .filter((u): u is GqlUser => Boolean(u?.login))
    .map((u) => ({
      login: u.login,
      displayName: u.displayName ?? u.login,
      profileImageUrl: u.profileImageURL ?? '',
      isLive: u.stream !== null,
      title: u.broadcastSettings?.title ?? '',
      viewerCount: u.stream?.viewersCount ?? 0,
      gameName: u.stream?.game?.displayName ?? '',
    }))
}

const STATUS_QUERY = `query($logins: [String!]) {
  users(logins: $logins) {
    login
    broadcastSettings { title }
    stream { viewersCount createdAt game { displayName } }
  }
}`

/** Live state for each login. Unknown logins are simply absent from the result. */
export async function getStreamStatuses(
  logins: string[],
  signal?: AbortSignal
): Promise<StreamStatus[]> {
  const data = await gql<{ users: (GqlUser | null)[] }>(STATUS_QUERY, { logins }, signal)
  return data.users
    .filter((u): u is GqlUser => u !== null)
    .map((u) => ({
      login: u.login,
      isLive: u.stream !== null,
      viewerCount: u.stream?.viewersCount ?? 0,
      title: u.broadcastSettings?.title ?? '',
      gameName: u.stream?.game?.displayName ?? '',
      startedAt: u.stream?.createdAt ?? null,
    }))
}

interface GqlGame {
  id: string
  displayName: string
  boxArtURL: string
  viewersCount: number | null
}

const GAME_FIELDS = 'id displayName boxArtURL(width: 144, height: 192) viewersCount'

const toCategory = (g: GqlGame): TwitchCategory => ({
  id: g.id,
  name: g.displayName,
  boxArtUrl: g.boxArtURL,
  viewerCount: g.viewersCount ?? 0,
})

export async function getTopCategories(signal?: AbortSignal): Promise<TwitchCategory[]> {
  const data = await gql<{ games: { edges: { node: GqlGame }[] } }>(
    `query { games(first: 30, options: { sort: VIEWER_COUNT }) { edges { node { ${GAME_FIELDS} } } } }`,
    {},
    signal
  )
  return data.games.edges.map((e) => toCategory(e.node))
}

export async function searchCategories(
  query: string,
  signal?: AbortSignal
): Promise<TwitchCategory[]> {
  const data = await gql<{ searchFor: { games: { edges: { item: GqlGame | null }[] } } | null }>(
    `query($q: String!) { searchFor(userQuery: $q, platform: "web") {
      games { edges { item { ... on Game { ${GAME_FIELDS} } } } }
    } }`,
    { q: query },
    signal
  )
  return (data.searchFor?.games.edges ?? [])
    .map((e) => e.item)
    .filter((g): g is GqlGame => Boolean(g?.id))
    .map(toCategory)
}

interface GqlCategoryStream {
  node: {
    title: string
    viewersCount: number
    previewImageURL: string
    freeformTags: { name: string }[] | null
    broadcaster: { login: string; displayName: string; profileImageURL: string } | null
  }
}

const CATEGORY_STREAMS_QUERY = `query($id: ID!, $sort: StreamSort!, $languages: [String!], $tags: [String!]) { game(id: $id) {
  streams(first: 100, options: { sort: $sort, languages: $languages, freeformTags: $tags }) {
    edges { node {
      title viewersCount previewImageURL(width: 440, height: 248) freeformTags { name }
      broadcaster { login displayName profileImageURL(width: 50) }
    } }
    pageInfo { hasNextPage }
  }
} }`

// Anonymous clients only get a category's first page: a request with an `after`
// cursor fails with IntegrityCheckFailed, because paging needs a
// Client-Integrity token that only twitch.tv itself can mint. Each sort order
// still returns its own first 100 (the most `first` allows), so the most
// watched, the least watched and the newest together reach far into the long
// tail. RELEVANCE was measured to add next to nothing on top of these three.
const CATEGORY_SORTS = ['VIEWER_COUNT', 'VIEWER_COUNT_ASC', 'RECENT']

function toCategoryStream({ node }: GqlCategoryStream): CategoryStream[] {
  // A banned broadcaster comes back as null.
  if (!node.broadcaster) return []
  return [
    {
      login: node.broadcaster.login,
      displayName: node.broadcaster.displayName,
      profileImageUrl: node.broadcaster.profileImageURL,
      title: node.title,
      viewerCount: node.viewersCount,
      thumbnailUrl: node.previewImageURL,
      tags: (node.freeformTags ?? []).map((t) => t.name),
    },
  ]
}

/** Joins stream lists into one, most watched first, keeping a channel's first appearance. */
export function mergeStreams(...lists: CategoryStream[][]): CategoryStream[] {
  const byLogin = new Map<string, CategoryStream>()
  for (const stream of lists.flat()) {
    if (!byLogin.has(stream.login)) byLogin.set(stream.login, stream)
  }
  return [...byLogin.values()].sort((a, b) => b.viewerCount - a.viewerCount)
}

/**
 * Live streams in a category, most watched first: as many as Twitch lists
 * without paging. `complete` is false when the category holds more than that.
 * `language` is an ISO 639-1 code. `tag` keeps only streams carrying that tag
 * (Twitch matches it whole, ignoring case), searched across the entire
 * category, so it reaches streams the unfiltered list can't.
 */
export async function getCategoryStreams(
  categoryId: string,
  opts: { language?: string; tag?: string } = {},
  signal?: AbortSignal
): Promise<CategoryStreamList> {
  const languages = opts.language ? [opts.language.toUpperCase()] : null
  const tags = opts.tag ? [opts.tag] : null
  const results = await Promise.allSettled(
    CATEGORY_SORTS.map((sort) =>
      gql<{
        game: {
          streams: { edges: GqlCategoryStream[]; pageInfo: { hasNextPage: boolean } }
        } | null
      }>(CATEGORY_STREAMS_QUERY, { id: categoryId, sort, languages, tags }, signal)
    )
  )
  const pages = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value.game?.streams] : []))
  // One failed sort only costs some of the tail; all of them failing is an error.
  if (pages.length === 0) throw (results[0] as PromiseRejectedResult).reason

  return {
    streams: mergeStreams(...pages.map((page) => (page?.edges ?? []).flatMap(toCategoryStream))),
    // Any sort that fits on one page has seen the whole category.
    complete: pages.some((page) => !page?.pageInfo.hasNextPage),
  }
}
