import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare class VendorGuard implements CanActivate {
  private reflector;
  constructor(reflector: Reflector);
  canActivate(context: ExecutionContext): boolean;
}
