import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JWTPayload {
  sub: string;
  name: string;
  email: string | null;
  type: 'VENDOR' | 'GOV' | 'ADMIN';
  capabilities: string[];
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET is not configured. Please set the JWT_SECRET environment variable.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      audience: configService.get<string>('JWT_AUDIENCE', 'marketplace-ai'),
      issuer: configService.get<string>('JWT_ISSUER', 'digital-marketplace'),
    });
  }

  async validate(payload: JWTPayload) {
    // Validate the payload structure
    if (!payload.sub || !payload.type) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user object that will be attached to request
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      type: payload.type,
      capabilities: payload.capabilities || [],
    };
  }
}
