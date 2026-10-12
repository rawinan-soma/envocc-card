import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrgLevel } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import type { RequestwithAdminData } from './request-admin.interface';

// Must run after JwtAccessGuardAdmin. Reads the admin's organization level
// from the database on every request, not from the JWT, so a change to the
// admin's organization takes effect without a new login.
@Injectable()
export class MinistryAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestwithAdminData>();
    const admin = await this.prisma.admins.findUnique({
      where: { id: request.user.id },
      select: { organization: { select: { level: true } } },
    });

    if (admin?.organization.level !== OrgLevel.MINISTRY) {
      throw new ForbiddenException('admin not at ministry level');
    }

    return true;
  }
}
