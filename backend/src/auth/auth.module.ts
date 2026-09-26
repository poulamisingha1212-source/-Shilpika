import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth0Strategy } from './auth0.strategy';
import { User } from '../users/user.entity';
import { ArtisanProfile } from '../users/artisan-profile.entity';
import { EmailOtp } from './email-otp.entity';
import { BrevoService } from './brevo.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, ArtisanProfile, EmailOtp]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, Auth0Strategy, BrevoService],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
