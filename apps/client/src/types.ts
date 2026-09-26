export interface TwitchSearchResult {
  login: string
  displayName: string
  profileImageUrl: string
  isLive: boolean
  title: string
  viewerCount: number
  gameName: string
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
  /** Live viewers across the category; absent for favourites saved before this was tracked. */
  viewerCount?: number
}

export interface CategoryStream {
  login: string
  displayName: string
  profileImageUrl: string
  title: string
  viewerCount: number
  thumbnailUrl: string
  tags: string[]
}

export interface CategoryStreamsPage {
  streams: CategoryStream[]
  cursor: string | null
}
