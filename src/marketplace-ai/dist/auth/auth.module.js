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
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthModule = void 0;
const common_1 = require('@nestjs/common');
const config_1 = require('@nestjs/config');
const jwt_1 = require('@nestjs/jwt');
const passport_1 = require('@nestjs/passport');
const jwt_strategy_1 = require('./strategies/jwt.strategy');
const guards_1 = require('./guards');
let AuthModule = class AuthModule {};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [
        passport_1.PassportModule,
        jwt_1.JwtModule.registerAsync({
          imports: [config_1.ConfigModule],
          useFactory: async (configService) => {
            const jwtSecret = configService.get('JWT_SECRET');
            if (!jwtSecret) {
              throw new Error(
                'JWT_SECRET is not configured. Please set the JWT_SECRET environment variable.',
              );
            }
            return {
              secret: jwtSecret,
              signOptions: {
                audience: configService.get('JWT_AUDIENCE', 'marketplace-ai'),
                issuer: configService.get('JWT_ISSUER', 'digital-marketplace'),
              },
            };
          },
          inject: [config_1.ConfigService],
        }),
      ],
      providers: [
        jwt_strategy_1.JwtStrategy,
        guards_1.AdminGuard,
        guards_1.GovernmentGuard,
        guards_1.VendorGuard,
        guards_1.RolesGuard,
        guards_1.CapabilitiesGuard,
      ],
      exports: [
        jwt_strategy_1.JwtStrategy,
        guards_1.AdminGuard,
        guards_1.GovernmentGuard,
        guards_1.VendorGuard,
        guards_1.RolesGuard,
        guards_1.CapabilitiesGuard,
      ],
    }),
  ],
  AuthModule,
);
//# sourceMappingURL=auth.module.js.map
