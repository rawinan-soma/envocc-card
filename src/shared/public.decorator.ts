import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata('isPublic', true);

export const isPublicRoute = (
  reflector: Reflector,
  context: ExecutionContext,
) =>
  reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getClass(),
    context.getHandler(),
  ]) === true;
