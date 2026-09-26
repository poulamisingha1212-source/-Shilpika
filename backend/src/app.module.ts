import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { MediaModule } from './media/media.module';
import { AiModule } from './ai/ai.module';
import { PricingModule } from './pricing/pricing.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuctionsModule } from './auctions/auctions.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createDatabaseSource, APP_ENTITIES } from './database/database.helper';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Winston structured logging
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ms, context, requestId }) => {
              return `${timestamp} [${context || 'App'}] ${level}: ${message}${requestId ? ` (req:${requestId})` : ''} ${ms}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),

    // TypeORM (PostgreSQL with in-memory emulator fallback)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isSsl =
          configService.get<string>('DATABASE_SSL') === 'true' ||
          configService.get<string>('NODE_ENV') === 'production' ||
          (configService.get<string>('DATABASE_URL') || '').includes('tsdb.cloud.timescale.com') ||
          (configService.get<string>('DATABASE_HOST') || '').includes('tsdb.cloud.timescale.com');
        return {
          type: 'postgres',
          url: configService.get<string>('DATABASE_URL'),
          host: configService.get<string>('DATABASE_HOST', 'localhost'),
          port: configService.get<number>('DATABASE_PORT', 5432),
          username: configService.get<string>('DATABASE_USER', 'postgres'),
          password: configService.get<string>('DATABASE_PASSWORD', 'password'),
          database: configService.get<string>('DATABASE_NAME', 'artisan_marketplace'),
          entities: APP_ENTITIES,
          synchronize: configService.get<string>('NODE_ENV') === 'development',
          logging: false,
          retryAttempts: 1,
          retryDelay: 500,
          ssl: isSsl ? { rejectUnauthorized: false } : false,
          extra: isSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
        };
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid options passed to dataSourceFactory');
        }
        return createDatabaseSource(options);
      },
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
        limit: configService.get<number>('THROTTLE_LIMIT', 100),
      }]),
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    MediaModule,
    AiModule,
    PricingModule,
    MarketplaceModule,
    InquiriesModule,
    AnalyticsModule,
    AuctionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
