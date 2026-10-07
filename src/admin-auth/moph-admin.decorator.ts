import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAccessGuardAdmin } from './jwt-access.guard';
import { MophAdminGuard } from './moph-admin.guard';

export const MophAdmin = () =>
  applyDecorators(UseGuards(JwtAccessGuardAdmin, MophAdminGuard));
