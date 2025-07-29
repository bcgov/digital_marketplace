import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export type UserType = 'VENDOR' | 'GOV' | 'ADMIN';
export declare const Roles: (
  ...roles: UserType[]
) => import('@nestjs/common').CustomDecorator<string>;
export declare class RolesGuard implements CanActivate {
  private reflector;
  constructor(reflector: Reflector);
  canActivate(context: ExecutionContext): boolean;
}
