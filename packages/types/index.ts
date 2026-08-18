export interface TwitchSearchResult {
  login: string
  displayName: string
  profileImageUrl: string
  isLive: boolean
  title: string
  viewerCount: number
  gameName: string
}

export interface FollowedChannel {
  broadcasterId: string
  broadcasterLogin: string
  broadcasterName: string
  profileImageUrl: string
  isLive: boolean
  viewerCount: number
  streamTitle: string
}

/** Live state of a single channel, polled for the streams currently on screen. */
export interface StreamStatus {
  login: string
  isLive: boolean
  viewerCount: number
  title: string
  gameName: string
  /** ISO timestamp the current stream started at, or null when offline. */
  startedAt: string | null
}

/**
 * Followed-channel payload. `userToken`/`refreshToken` are only present when the
 * server had to rotate an expired Twitch token while serving the request — the
 * client must then replace the credentials it holds.
 */
export interface FollowedChannelsResponse {
  channels: FollowedChannel[]
  userToken?: string
  refreshToken?: string
}

export interface StreamSlot {
  id: string
  channel: string
  nativeMode: boolean
}

export interface StreamCollection {
  id: string
  name: string
  channels: string[]
  main: string | null
}

export interface TwitchCategory {
  id: string
  name: string
  boxArtUrl: string
}

export interface CategoryStream {
  login: string
  displayName: string
  title: string
  viewerCount: number
  thumbnailUrl: string
  gameName: string
  tags: string[]
}

export interface CategoryStreamsPage {
  streams: CategoryStream[]
  cursor: string | null
}

export interface DiscoverData {
  categories: TwitchCategory[]
  streams: CategoryStream[]
}
