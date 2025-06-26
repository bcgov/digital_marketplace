import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  AdminGuard,
  GovernmentGuard,
  VendorGuard,
  RolesGuard,
  CapabilitiesGuard,
} from './guards';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
          throw new Error(
            'JWT_SECRET is not configured. Please set the JWT_SECRET environment variable.',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            audience: configService.get<string>(
              'JWT_AUDIENCE',
              'marketplace-ai',
            ),
            issuer: configService.get<string>(
              'JWT_ISSUER',
              'digital-marketplace',
            ),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    JwtStrategy,
    AdminGuard,
    GovernmentGuard,
    VendorGuard,
    RolesGuard,
    CapabilitiesGuard,
  ],
  exports: [
    JwtStrategy,
    AdminGuard,
    GovernmentGuard,
    VendorGuard,
    RolesGuard,
    CapabilitiesGuard,
  ],
})
export class AuthModule {}
