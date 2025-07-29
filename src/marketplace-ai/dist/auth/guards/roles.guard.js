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
exports.RolesGuard = exports.Roles = void 0;
const common_1 = require('@nestjs/common');
const core_1 = require('@nestjs/core');
const common_2 = require('@nestjs/common');
const Roles = (...roles) => (0, common_2.SetMetadata)('roles', roles);
exports.Roles = Roles;
let RolesGuard = class RolesGuard {
  reflector;
  constructor(reflector) {
    this.reflector = reflector;
  }
  canActivate(context) {
    const requiredRoles = this.reflector.get('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new common_1.ForbiddenException('User not authenticated');
    }
    const hasRole = requiredRoles.includes(user.type);
    if (!hasRole) {
      throw new common_1.ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [core_1.Reflector]),
  ],
  RolesGuard,
);
//# sourceMappingURL=roles.guard.js.map
