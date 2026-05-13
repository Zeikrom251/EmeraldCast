import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import * as compression from 'compression'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(compression())
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableCors({
    origin: process.env.FRONT_URL ?? 'http://localhost:5173',
    credentials: true,
  })
  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`EmeraldCast API running on http://localhost:${port}/api`)
}
bootstrap()
