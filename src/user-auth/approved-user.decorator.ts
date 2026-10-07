import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApprovedUserGuard } from './approved-user.guard';
import { JwtAccessGuardUser } from './jwt-access.guard';

export const ApprovedUser = () =>
  applyDecorators(UseGuards(JwtAccessGuardUser, ApprovedUserGuard));
