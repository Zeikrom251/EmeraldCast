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
}

export interface CategoryStreamsPage {
  streams: CategoryStream[]
  cursor: string | null
}

export interface DiscoverData {
  categories: TwitchCategory[]
  streams: CategoryStream[]
}
