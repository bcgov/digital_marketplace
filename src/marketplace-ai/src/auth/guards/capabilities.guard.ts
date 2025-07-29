import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

// Decorator to specify required capabilities
export const RequireCapabilities = (...capabilities: string[]) =>
  SetMetadata('capabilities', capabilities);

@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredCapabilities = this.reflector.get<string[]>(
      'capabilities',
      context.getHandler(),
    );

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true; // No capabilities specified, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userCapabilities = user.capabilities || [];

    // Check if user has all required capabilities
    const hasAllCapabilities = requiredCapabilities.every((capability) =>
      userCapabilities.includes(capability),
    );

    if (!hasAllCapabilities) {
      throw new ForbiddenException(
        `Access denied. Required capabilities: ${requiredCapabilities.join(
          ', ',
        )}`,
      );
    }

    return true;
  }
}
