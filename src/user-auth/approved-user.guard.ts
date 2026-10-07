import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/shared/public.decorator';
import { JwtAccessGuardUser } from './jwt-access.guard';
import type { RequestwithUserData } from './request-user-interface';

// Relies on JwtAccessStrategy, which re-reads the user (including
// is_validate) from the database on every request, so admin approval takes
// effect without a new login. Use via @ApprovedUser() to keep guard order.
@Injectable()
export class ApprovedUserGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestwithUserData>();
    if (!request.user?.is_validate) {
      throw new ForbiddenException('user not validated');
    }

    return true;
  }
}

export const ApprovedUser = () =>
  applyDecorators(UseGuards(JwtAccessGuardUser, ApprovedUserGuard));
