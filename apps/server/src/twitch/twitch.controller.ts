import { Controller, Get, Query, Redirect, BadRequestException, Headers } from '@nestjs/common'
import { TwitchService, parseLogins } from './twitch.service'
import {
  SearchQueryDto,
  CategorySearchQueryDto,
  CategoryStreamsQueryDto,
  StreamStatusQueryDto,
} from './dto/twitch-query.dto'
import type {
  TwitchSearchResult,
  TwitchCategory,
  CategoryStreamsPage,
  DiscoverData,
  StreamStatus,
  FollowedChannelsResponse,
} from '@repo/types'
import { ConfigService } from '@nestjs/config'

@Controller('twitch')
export class TwitchController {
  constructor(
    private readonly twitchService: TwitchService,
    private readonly config: ConfigService
  ) {}

  @Get('search')
  searchChannels(@Query() query: SearchQueryDto): Promise<TwitchSearchResult[]> {
    return this.twitchService.searchChannels(query.q)
  }

  @Get('categories/search')
  searchCategories(@Query() query: CategorySearchQueryDto): Promise<TwitchCategory[]> {
    return this.twitchService.searchCategories(query.q)
  }

  @Get('categories/streams')
  getCategoryStreams(@Query() query: CategoryStreamsQueryDto): Promise<CategoryStreamsPage> {
    return this.twitchService.getStreamsByCategory(query.gameId, query.cursor, query.language)
  }

  @Get('streams/status')
  getStreamStatuses(@Query() query: StreamStatusQueryDto): Promise<StreamStatus[]> {
    return this.twitchService.getStreamStatuses(parseLogins(query.logins))
  }

  @Get('discover')
  getDiscover(): Promise<DiscoverData> {
    return this.twitchService.getDiscover()
  }

  @Get('followed')
  async getFollowed(
    @Headers('authorization') auth: string,
    @Headers('x-refresh-token') refreshToken?: string
  ): Promise<FollowedChannelsResponse> {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) throw new BadRequestException('Missing token')
    return this.twitchService.refreshFollowedChannels(token, refreshToken || undefined)
  }

  @Get('auth/login')
  @Redirect()
  authLogin() {
    const url = this.twitchService.getLoginUrl()
    return { url }
  }

  @Get('auth/callback')
  @Redirect()
  async authCallback(@Query('code') code: string) {
    if (!code) throw new BadRequestException('Missing OAuth code')
    const token = await this.twitchService.handleOAuthCallback(code)
    const frontUrl = this.config.get<string>('FRONT_URL') ?? 'http://localhost:5173'
    return { url: `${frontUrl}/callback#token=${encodeURIComponent(token)}` }
  }
}
