export interface TwitchStreamer {
  id: string
  login: string
  displayName: string
  profileImageUrl: string
  description: string
}

export interface TwitchStream {
  id: string
  userId: string
  userLogin: string
  userName: string
  gameId: string
  gameName: string
  title: string
  viewerCount: number
  startedAt: string
  thumbnailUrl: string
  isLive: boolean
}

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

export interface LayoutConfig {
  id: string
  name: string
  streams: string[]
  createdAt: string
}

export interface StreamSlot {
  id: string
  channel: string
  muted: boolean
  focused: boolean
  nativeMode: boolean
}
