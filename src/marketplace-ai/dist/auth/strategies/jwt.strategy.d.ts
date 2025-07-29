import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
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
declare const JwtStrategy_base: new (
  ...args:
    | [opt: import('passport-jwt').StrategyOptionsWithRequest]
    | [opt: import('passport-jwt').StrategyOptionsWithoutRequest]
) => Strategy & {
  validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
  private configService;
  constructor(configService: ConfigService);
  validate(payload: JWTPayload): Promise<{
    id: string;
    name: string;
    email: string | null;
    type: 'ADMIN' | 'GOV' | 'VENDOR';
    capabilities: string[];
  }>;
}
export {};
