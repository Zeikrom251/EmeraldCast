import { Controller, Get, Query, Redirect, BadRequestException, Headers } from '@nestjs/common'
import { TwitchService } from './twitch.service'
import { SearchQueryDto } from './dto/twitch-query.dto'
import type { TwitchSearchResult } from '@repo/types'
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

  @Get('followed')
  async getFollowed(@Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) throw new BadRequestException('Missing token')
    return this.twitchService.refreshFollowedChannels(token)
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
