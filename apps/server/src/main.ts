import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import * as compression from 'compression'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // Behind a hosting proxy every request arrives from the proxy's IP, which
  // would make the rate limiter treat all visitors as one client. Opt in only
  // where a trusted proxy really is in front, since it lets clients spoof
  // X-Forwarded-For otherwise.
  if (process.env.TRUST_PROXY === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1)
  }
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
