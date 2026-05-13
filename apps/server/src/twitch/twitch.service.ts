import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import axios, { AxiosInstance } from 'axios'
import type { TwitchSearchResult, TwitchStream, FollowedChannel } from '@repo/types'

interface TwitchTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface TwitchHelixUser {
  id: string
  login: string
  display_name: string
  profile_image_url: string
  description: string
}

interface TwitchHelixStream {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  title: string
  viewer_count: number
  started_at: string
  thumbnail_url: string
}

interface TwitchHelixSearchChannel {
  broadcaster_login: string
  display_name: string
  thumbnail_url: string
  is_live: boolean
  title: string
  broadcaster_language: string
  game_name: string
}

interface TwitchHelixFollowedChannel {
  broadcaster_id: string
  broadcaster_login: string
  broadcaster_name: string
  followed_at: string
}

interface TwitchHelixUserToken {
  id: string
  login: string
  display_name: string
  profile_image_url: string
}

export interface FollowedChannelsPayload {
  username: string
  channels: FollowedChannel[]
}

@Injectable()
export class TwitchService implements OnModuleInit {
  private readonly logger = new Logger(TwitchService.name)
  private helix!: AxiosInstance
  private accessToken = ''
  private tokenExpiresAt = 0

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService
  ) {}

  async onModuleInit() {
    await this.refreshToken()
  }

  private async refreshToken() {
    const clientId = this.config.get<string>('TWITCH_CLIENT_ID')
    const clientSecret = this.config.get<string>('TWITCH_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      this.logger.warn(
        'TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not set — Twitch API will not work'
      )
      return
    }

    try {
      const { data } = await axios.post<TwitchTokenResponse>(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
          params: {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
          },
        }
      )

      this.accessToken = data.access_token
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000 // refresh 1 min early

      this.helix = axios.create({
        baseURL: 'https://api.twitch.tv/helix',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      this.logger.log('Twitch access token refreshed')
    } catch (err) {
      this.logger.error('Failed to obtain Twitch access token', err)
    }
  }

  private async ensureToken() {
    if (Date.now() >= this.tokenExpiresAt) {
      await this.refreshToken()
    }
    if (!this.helix) {
      throw new InternalServerErrorException(
        'Twitch API is not configured — set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET'
      )
    }
  }

  async searchChannels(query: string): Promise<TwitchSearchResult[]> {
    await this.ensureToken()

    try {
      const { data } = await this.helix.get<{ data: TwitchHelixSearchChannel[] }>(
        '/search/channels',
        { params: { query, first: 10, live_only: false } }
      )

      const channels = data.data

      // /search/channels omits viewer_count — fetch live stream data separately to get it
      const liveLogins = channels.filter((ch) => ch.is_live).map((ch) => ch.broadcaster_login)

      const viewerCountMap = new Map<string, number>()
      if (liveLogins.length > 0) {
        const streamsParams = new URLSearchParams()
        liveLogins.forEach((login) => streamsParams.append('user_login', login))
        streamsParams.append('first', '100')

        const { data: streamsData } = await this.helix.get<{ data: TwitchHelixStream[] }>(
          '/streams',
          { params: streamsParams }
        )
        for (const stream of streamsData.data) {
          viewerCountMap.set(stream.user_login.toLowerCase(), stream.viewer_count)
        }
      }

      return channels.map((ch) => ({
        login: ch.broadcaster_login,
        displayName: ch.display_name,
        profileImageUrl: ch.thumbnail_url,
        isLive: ch.is_live,
        title: ch.title,
        viewerCount: viewerCountMap.get(ch.broadcaster_login.toLowerCase()) ?? 0,
        gameName: ch.game_name,
      }))
    } catch (err) {
      this.logger.error('searchChannels failed', err)
      throw new InternalServerErrorException('Failed to search Twitch channels')
    }
  }

  async getStreams(channels: string[]): Promise<TwitchStream[]> {
    await this.ensureToken()

    if (channels.length === 0) return []

    const safeChannels = channels.slice(0, 100)

    try {
      const params = new URLSearchParams()
      safeChannels.forEach((ch) => params.append('user_login', ch.toLowerCase()))
      params.append('first', '100')

      const { data: streamsData } = await this.helix.get<{ data: TwitchHelixStream[] }>(
        '/streams',
        { params }
      )

      const usersParams = new URLSearchParams()
      safeChannels.forEach((ch) => usersParams.append('login', ch.toLowerCase()))

      const { data: usersData } = await this.helix.get<{ data: TwitchHelixUser[] }>('/users', {
        params: usersParams,
      })

      const userMap = new Map(usersData.data.map((u) => [u.login.toLowerCase(), u]))
      const liveMap = new Map(streamsData.data.map((s) => [s.user_login.toLowerCase(), s]))

      return safeChannels.map((ch) => {
        const login = ch.toLowerCase()
        const user = userMap.get(login)
        const stream = liveMap.get(login)

        return {
          id: stream?.id ?? user?.id ?? login,
          userId: user?.id ?? '',
          userLogin: login,
          userName: user?.display_name ?? ch,
          gameId: stream?.game_id ?? '',
          gameName: stream?.game_name ?? '',
          title: stream?.title ?? '',
          viewerCount: stream?.viewer_count ?? 0,
          startedAt: stream?.started_at ?? '',
          thumbnailUrl: stream?.thumbnail_url ?? '',
          isLive: Boolean(stream),
        }
      })
    } catch (err) {
      this.logger.error('getStreams failed', err)
      throw new InternalServerErrorException('Failed to fetch Twitch stream data')
    }
  }

  getLoginUrl(): string {
    const clientId = this.config.get<string>('TWITCH_CLIENT_ID')
    const redirectUri = this.config.get<string>('TWITCH_REDIRECT_URI')
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Twitch OAuth not configured')
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user:read:follows',
    })
    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
  }

  async handleOAuthCallback(code: string): Promise<string> {
    const clientId = this.config.get<string>('TWITCH_CLIENT_ID')
    const clientSecret = this.config.get<string>('TWITCH_CLIENT_SECRET')
    const redirectUri = this.config.get<string>('TWITCH_REDIRECT_URI')
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Twitch OAuth not configured')
    }

    const { data: tokenData } = await axios.post<{ access_token: string }>(
      'https://id.twitch.tv/oauth2/token',
      null,
      {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        },
      }
    )
    const userAccessToken = tokenData.access_token
    const { username, channels } = await this.fetchFollowedChannels(userAccessToken)
    return this.jwt.sign({ username, channels, userToken: userAccessToken })
  }

  private async fetchFollowedChannels(
    userToken: string
  ): Promise<{ username: string; channels: FollowedChannel[] }> {
    const clientId = this.config.get<string>('TWITCH_CLIENT_ID')!
    const userHelix = axios.create({
      baseURL: 'https://api.twitch.tv/helix',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${userToken}`,
      },
    })

    const { data: meData } = await userHelix.get<{ data: TwitchHelixUserToken[] }>('/users')
    const me = meData.data[0]
    if (!me) throw new InternalServerErrorException('Could not resolve Twitch user identity')

    const followed: TwitchHelixFollowedChannel[] = []
    let cursor: string | undefined

    do {
      const params: Record<string, string | number> = { user_id: me.id, first: 100 }
      if (cursor) params.after = cursor

      const { data: followData } = await userHelix.get<{
        data: TwitchHelixFollowedChannel[]
        pagination?: { cursor?: string }
      }>('/channels/followed', { params })

      followed.push(...followData.data)
      cursor = followData.pagination?.cursor
    } while (cursor)

    const liveMap = new Map<string, { viewer_count: number; title: string }>()
    for (let i = 0; i < followed.length; i += 100) {
      const batch = followed.slice(i, i + 100)
      const sp = new URLSearchParams()
      batch.forEach((ch) => sp.append('user_login', ch.broadcaster_login))
      sp.append('first', '100')

      const { data: streamsData } = await userHelix.get<{ data: TwitchHelixStream[] }>('/streams', {
        params: sp,
      })
      for (const s of streamsData.data) {
        liveMap.set(s.user_login.toLowerCase(), { viewer_count: s.viewer_count, title: s.title })
      }
    }

    const profileMap = new Map<string, string>()
    for (let i = 0; i < followed.length; i += 100) {
      const batch = followed.slice(i, i + 100)
      const up = new URLSearchParams()
      batch.forEach((ch) => up.append('login', ch.broadcaster_login))
      const { data: usersData } = await userHelix.get<{ data: TwitchHelixUserToken[] }>('/users', {
        params: up,
      })
      for (const u of usersData.data) {
        profileMap.set(u.login.toLowerCase(), u.profile_image_url)
      }
    }

    const channels: FollowedChannel[] = followed.map((ch) => {
      const login = ch.broadcaster_login.toLowerCase()
      const live = liveMap.get(login)
      return {
        broadcasterId: ch.broadcaster_id,
        broadcasterLogin: login,
        broadcasterName: ch.broadcaster_name,
        profileImageUrl: profileMap.get(login) ?? '',
        isLive: Boolean(live),
        viewerCount: live?.viewer_count ?? 0,
        streamTitle: live?.title ?? '',
      }
    })

    channels.sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1
      return a.broadcasterName.localeCompare(b.broadcasterName)
    })

    return { username: me.login, channels }
  }

  async refreshFollowedChannels(userToken: string): Promise<FollowedChannel[]> {
    const { channels } = await this.fetchFollowedChannels(userToken)
    return channels
  }
}
