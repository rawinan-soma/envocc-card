import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrgLevel } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import type { RequestwithAdminData } from './request-admin.interface';

// organizations.code of กระทรวงสาธารณสุข (Ministry of Public Health).
export const MOPH_ORG_CODE = '15000';

// Both guards must run after JwtAccessGuardAdmin. They read the admin's
// organization from the database on every request, not from the JWT, so a
// change to the admin's organization takes effect without a new login.
const adminOrganization = async (
  prisma: PrismaService,
  context: ExecutionContext,
) => {
  const request = context.switchToHttp().getRequest<RequestwithAdminData>();
  const admin = await prisma.admins.findUnique({
    where: { id: request.user.id },
    select: { organization: { select: { level: true, code: true } } },
  });
  return admin?.organization;
};

@Injectable()
export class MinistryAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const org = await adminOrganization(this.prisma, context);

    if (org?.level !== OrgLevel.MINISTRY) {
      throw new ForbiddenException('admin not at ministry level');
    }

    return true;
  }
}

@Injectable()
export class MophAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const org = await adminOrganization(this.prisma, context);

    // Codes are not unique across levels, so match the level as well.
    if (org?.level !== OrgLevel.MINISTRY || org.code !== MOPH_ORG_CODE) {
      throw new ForbiddenException('admin is not from MOPH');
    }

    return true;
  }
}
