import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Winston for logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const env = configService.get<string>('NODE_ENV', 'development');

  // Security (allow fonts and script assets for rich SPA UI)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Serve static web app from public directory
  const fs = require('fs');
  const publicDir = fs.existsSync(path.join(process.cwd(), 'public'))
    ? path.join(process.cwd(), 'public')
    : fs.existsSync(path.join(process.cwd(), 'backend', 'public'))
    ? path.join(process.cwd(), 'backend', 'public')
    : path.join(__dirname, '..', '..', 'public');
  app.use(express.static(publicDir));

  // Serve uploaded and enhanced media
  const uploadsDir = fs.existsSync(path.join(process.cwd(), 'backend', 'uploads'))
    ? path.join(process.cwd(), 'backend', 'uploads')
    : path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // SPA fallback: deep links like /market/product/DHOKRA-001 must resolve to
  // index.html on refresh, direct opens, and shared links (WhatsApp, email…).
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Global prefix for API
  app.setGlobalPrefix('api/v1');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new LoggingInterceptor(logger),
  );

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('Artisan AI Marketplace API')
    .setDescription('Backend API for the Artisan AI Marketplace — voice-first, AI-assisted platform for marginalized artisans')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`🚀 Artisan AI Marketplace backend running on http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`📖 Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
