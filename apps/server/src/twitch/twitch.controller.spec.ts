import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { TwitchController } from './twitch.controller'
import { TwitchService } from './twitch.service'

describe('TwitchController', () => {
  let controller: TwitchController
  let service: TwitchService

  const mockService = {
    searchChannels: jest.fn().mockResolvedValue([]),
    refreshFollowedChannels: jest.fn().mockResolvedValue({ channels: [] }),
    searchCategories: jest.fn().mockResolvedValue([]),
    getStreamsByCategory: jest.fn().mockResolvedValue({ streams: [], cursor: null }),
    getDiscover: jest.fn().mockResolvedValue({ categories: [], streams: [] }),
    getStreamStatuses: jest.fn().mockResolvedValue([]),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      controllers: [TwitchController],
      providers: [{ provide: TwitchService, useValue: mockService }],
    }).compile()

    controller = module.get<TwitchController>(TwitchController)
    service = module.get<TwitchService>(TwitchService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('searchChannels delegates to service', async () => {
    await controller.searchChannels({ q: 'shroud' })
    expect(service.searchChannels).toHaveBeenCalledWith('shroud')
  })

  it('searchCategories delegates to service', async () => {
    await controller.searchCategories({ q: 'grand theft auto' })
    expect(service.searchCategories).toHaveBeenCalledWith('grand theft auto')
  })

  it('getCategoryStreams delegates gameId, cursor and language to service', async () => {
    await controller.getCategoryStreams({ gameId: '32982', cursor: 'abc', language: 'fr' })
    expect(service.getStreamsByCategory).toHaveBeenCalledWith('32982', 'abc', 'fr')
  })

  it('getDiscover delegates to service', async () => {
    await controller.getDiscover()
    expect(service.getDiscover).toHaveBeenCalled()
  })

  it('getFollowed rejects a missing bearer token', async () => {
    await expect(controller.getFollowed('')).rejects.toThrow('Missing token')
  })

  it('getFollowed delegates the bearer token to the service', async () => {
    await controller.getFollowed('Bearer abc123')
    expect(service.refreshFollowedChannels).toHaveBeenCalledWith('abc123', undefined)
  })

  it('getFollowed passes the refresh token through when the client sends one', async () => {
    await controller.getFollowed('Bearer abc123', 'refresh-me')
    expect(service.refreshFollowedChannels).toHaveBeenCalledWith('abc123', 'refresh-me')
  })

  it('getStreamStatuses sanitises the login list before delegating', async () => {
    await controller.getStreamStatuses({ logins: 'Shroud, pokimane ,shroud,bad login!' })
    expect(service.getStreamStatuses).toHaveBeenCalledWith(['pokimane', 'shroud'])
  })
})
