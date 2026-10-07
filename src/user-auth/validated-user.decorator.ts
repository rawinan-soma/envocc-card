import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAccessGuardUser } from './jwt-access.guard';
import { ValidatedUserGuard } from './validated-user.guard';

export const ValidatedUser = () =>
  applyDecorators(UseGuards(JwtAccessGuardUser, ValidatedUserGuard));
