import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { isPublicRoute } from 'src/shared/public.decorator';

@Injectable()
export class JwtAccessGuardUser extends AuthGuard('jwt-access-user') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return isPublicRoute(this.reflector, context)
      ? true
      : super.canActivate(context);
  }
}
