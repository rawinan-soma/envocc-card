import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import type { RequestwithAdminData } from './request-admin.interface';

// organizations.code of กระทรวงสาธารณสุข (Ministry of Public Health).
export const MOPH_ORG_CODE = '15000';

// Must run after JwtAccessGuardAdmin (apply via @MophAdmin()). Reads the
// admin's organization from the database on every request, not from the JWT.
@Injectable()
export class MophAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestwithAdminData>();
    const admin = await this.prisma.admins.findUnique({
      where: { id: request.user.id },
      select: { organization: { select: { level: true, code: true } } },
    });

    // Codes are not unique across levels, so match the level as well.
    const org = admin?.organization;
    if (org?.level !== 'MINISTRY' || org.code !== MOPH_ORG_CODE) {
      throw new ForbiddenException('admin is not from MOPH');
    }

    return true;
  }
}
