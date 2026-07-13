import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { TwitchController } from './twitch.controller'
import { TwitchService } from './twitch.service'

describe('TwitchController', () => {
  let controller: TwitchController
  let service: TwitchService

  const mockService = {
    searchChannels: jest.fn().mockResolvedValue([]),
    refreshFollowedChannels: jest.fn().mockResolvedValue([]),
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

  it('getFollowed rejects a missing bearer token', async () => {
    await expect(controller.getFollowed('')).rejects.toThrow('Missing token')
  })

  it('getFollowed delegates the bearer token to the service', async () => {
    await controller.getFollowed('Bearer abc123')
    expect(service.refreshFollowedChannels).toHaveBeenCalledWith('abc123')
  })
})
