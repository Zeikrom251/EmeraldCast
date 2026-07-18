import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import axios, { AxiosInstance } from 'axios'
import type {
  TwitchSearchResult,
  FollowedChannel,
  TwitchCategory,
  CategoryStreamsPage,
  CategoryStream,
  DiscoverData,
} from '@repo/types'

interface TwitchTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
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

interface TwitchHelixCategory {
  id: string
  name: string
  box_art_url: string
}

const HELIX_PAGE_SIZE = 100

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
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
        const streams = await this.fetchStreamsByLogin(this.helix, liveLogins)
        for (const stream of streams) {
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

  async searchCategories(query: string): Promise<TwitchCategory[]> {
    await this.ensureToken()

    try {
      const { data } = await this.helix.get<{ data: TwitchHelixCategory[] }>(
        '/search/categories',
        { params: { query, first: 20 } }
      )

      return data.data.map((c) => ({
        id: c.id,
        name: c.name,
        boxArtUrl: this.normalizeBoxArt(c.box_art_url),
      }))
    } catch (err) {
      this.logger.error('searchCategories failed', err)
      throw new InternalServerErrorException('Failed to search Twitch categories')
    }
  }

  // Twitch box art comes either as a {width}x{height} template (e.g. /games) or at a
  // fixed low resolution (…-52x72.jpg from /search/categories) — normalise both to a crisp size.
  private normalizeBoxArt(url: string): string {
    return url
      .replace('{width}', '144')
      .replace('{height}', '192')
      .replace(/-\d+x\d+\.jpg$/, '-144x192.jpg')
  }

  async getStreamsByCategory(
    gameId: string,
    cursor?: string,
    language?: string
  ): Promise<CategoryStreamsPage> {
    await this.ensureToken()

    try {
      const params: Record<string, string | number> = {
        game_id: gameId,
        first: HELIX_PAGE_SIZE,
      }
      if (cursor) params.after = cursor
      if (language) params.language = language

      const { data } = await this.helix.get<{
        data: TwitchHelixStream[]
        pagination?: { cursor?: string }
      }>('/streams', { params })

      const streams = data.data.map((s) => this.mapStream(s))

      return { streams, cursor: data.pagination?.cursor ?? null }
    } catch (err) {
      this.logger.error('getStreamsByCategory failed', err)
      throw new InternalServerErrorException('Failed to load streams for category')
    }
  }

  async getDiscover(): Promise<DiscoverData> {
    await this.ensureToken()

    try {
      const [gamesRes, streamsRes] = await Promise.all([
        this.helix.get<{ data: TwitchHelixCategory[] }>('/games/top', { params: { first: 12 } }),
        this.helix.get<{ data: TwitchHelixStream[] }>('/streams', { params: { first: 12 } }),
      ])

      const categories = gamesRes.data.data.map((c) => ({
        id: c.id,
        name: c.name,
        boxArtUrl: this.normalizeBoxArt(c.box_art_url),
      }))
      const streams = streamsRes.data.data.map((s) => this.mapStream(s))

      return { categories, streams }
    } catch (err) {
      this.logger.error('getDiscover failed', err)
      throw new InternalServerErrorException('Failed to load discovery data')
    }
  }

  private mapStream(s: TwitchHelixStream): CategoryStream {
    return {
      login: s.user_login,
      displayName: s.user_name,
      title: s.title,
      viewerCount: s.viewer_count,
      thumbnailUrl: s.thumbnail_url.replace('{width}', '440').replace('{height}', '248'),
      gameName: s.game_name,
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

  private async fetchStreamsByLogin(
    client: AxiosInstance,
    logins: string[]
  ): Promise<TwitchHelixStream[]> {
    const batches = await Promise.all(
      chunk(logins, HELIX_PAGE_SIZE).map(async (batch) => {
        const params = new URLSearchParams()
        batch.forEach((login) => params.append('user_login', login))
        params.append('first', String(HELIX_PAGE_SIZE))
        const { data } = await client.get<{ data: TwitchHelixStream[] }>('/streams', { params })
        return data.data
      })
    )
    return batches.flat()
  }

  private async fetchUsersByLogin(
    client: AxiosInstance,
    logins: string[]
  ): Promise<TwitchHelixUserToken[]> {
    const batches = await Promise.all(
      chunk(logins, HELIX_PAGE_SIZE).map(async (batch) => {
        const params = new URLSearchParams()
        batch.forEach((login) => params.append('login', login))
        const { data } = await client.get<{ data: TwitchHelixUserToken[] }>('/users', { params })
        return data.data
      })
    )
    return batches.flat()
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
      const params: Record<string, string | number> = { user_id: me.id, first: HELIX_PAGE_SIZE }
      if (cursor) params.after = cursor

      const { data: followData } = await userHelix.get<{
        data: TwitchHelixFollowedChannel[]
        pagination?: { cursor?: string }
      }>('/channels/followed', { params })

      followed.push(...followData.data)
      cursor = followData.pagination?.cursor
    } while (cursor)

    const logins = followed.map((ch) => ch.broadcaster_login)
    const [streams, users] = await Promise.all([
      this.fetchStreamsByLogin(userHelix, logins),
      this.fetchUsersByLogin(userHelix, logins),
    ])

    const liveMap = new Map(streams.map((s) => [s.user_login.toLowerCase(), s]))
    const profileMap = new Map(users.map((u) => [u.login.toLowerCase(), u.profile_image_url]))

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
