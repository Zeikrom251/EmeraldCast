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
