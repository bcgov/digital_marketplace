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
exports.GovernmentGuard = void 0;
const common_1 = require('@nestjs/common');
const core_1 = require('@nestjs/core');
let GovernmentGuard = class GovernmentGuard {
  reflector;
  constructor(reflector) {
    this.reflector = reflector;
  }
  canActivate(context) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new common_1.ForbiddenException('User not authenticated');
    }
    if (user.type !== 'GOV' && user.type !== 'ADMIN') {
      throw new common_1.ForbiddenException('Government access required');
    }
    return true;
  }
};
exports.GovernmentGuard = GovernmentGuard;
exports.GovernmentGuard = GovernmentGuard = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [core_1.Reflector]),
  ],
  GovernmentGuard,
);
//# sourceMappingURL=government.guard.js.map
