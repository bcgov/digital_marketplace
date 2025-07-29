import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const RequireCapabilities: (
  ...capabilities: string[]
) => import('@nestjs/common').CustomDecorator<string>;
export declare class CapabilitiesGuard implements CanActivate {
  private reflector;
  constructor(reflector: Reflector);
  canActivate(context: ExecutionContext): boolean;
}
