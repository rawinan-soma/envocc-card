import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isPublicRoute } from 'src/shared/public.decorator';
import type { RequestwithUserData } from './request-user-interface';

// Relies on JwtAccessStrategy, which re-reads the user (including
// is_validate) from the database on every request, so admin approval takes
// effect without a new login. Apply via @ApprovedUser() to keep guard order.
@Injectable()
export class ApprovedUserGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (isPublicRoute(this.reflector, context)) return true;

    const request = context.switchToHttp().getRequest<RequestwithUserData>();
    if (!request.user?.is_validate) {
      throw new ForbiddenException('user not validated');
    }

    return true;
  }
}
