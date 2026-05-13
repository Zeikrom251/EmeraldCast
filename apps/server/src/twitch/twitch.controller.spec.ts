import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { TwitchController } from './twitch.controller'
import { TwitchService } from './twitch.service'

describe('TwitchController', () => {
  let controller: TwitchController
  let service: TwitchService

  const mockService = {
    searchChannels: jest.fn().mockResolvedValue([]),
    getStreams: jest.fn().mockResolvedValue([]),
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

  it('getStreams splits comma-separated channels', async () => {
    await controller.getStreams({ channels: 'shroud,ninja' })
    expect(service.getStreams).toHaveBeenCalledWith(['shroud', 'ninja'])
  })
})
