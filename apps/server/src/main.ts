import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Server running on http://localhost:${port}`);
}
bootstrap();
