'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.JwtStrategy = void 0;
const common_1 = require('@nestjs/common');
const config_1 = require('@nestjs/config');
const passport_1 = require('@nestjs/passport');
const passport_jwt_1 = require('passport-jwt');
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(
  passport_jwt_1.Strategy,
) {
  configService;
  constructor(configService) {
    const jwtSecret = configService.get('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET is not configured. Please set the JWT_SECRET environment variable.',
      );
    }
    super({
      jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      audience: configService.get('JWT_AUDIENCE', 'marketplace-ai'),
      issuer: configService.get('JWT_ISSUER', 'digital-marketplace'),
    });
    this.configService = configService;
  }
  async validate(payload) {
    if (!payload.sub || !payload.type) {
      throw new common_1.UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      type: payload.type,
      capabilities: payload.capabilities || [],
    };
  }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [config_1.ConfigService]),
  ],
  JwtStrategy,
);
//# sourceMappingURL=jwt.strategy.js.map
