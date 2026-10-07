import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import type { RequestwithUserData } from './request-user-interface';

// Must run after JwtAccessGuardUser (apply via @ValidatedUser()). Reads
// is_validate from the database on every request, not from the JWT, so admin
// validation takes effect without a new login.
@Injectable()
export class ValidatedUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestwithUserData>();
    const user = await this.prisma.users.findUnique({
      where: { id: request.user.id },
      select: { is_validate: true },
    });

    if (!user?.is_validate) {
      throw new ForbiddenException('user not validated');
    }

    return true;
  }
}
