import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class GovernmentGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Allow both GOV and ADMIN users (both are government/public sector)
    if (user.type !== 'GOV' && user.type !== 'ADMIN') {
      throw new ForbiddenException('Government access required');
    }

    return true;
  }
}
