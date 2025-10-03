import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'prisma/prisma.service';
import { TokenPayload } from 'src/shared/payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access-admin',
) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.Authentication as string;
        },
      ]),
      secretOrKey: config.get('ACCESS_TOKEN_SECRET')!,
    });
  }

  async validate(payload: TokenPayload) {
    const admin = await this.prisma.admins.findUnique(
      Prisma.validator<Prisma.adminsFindUniqueArgs>()({
        where: { id: payload.id },
        select: {
          username: true,
          role: true,
          id: true,
          organization: { select: { level: true } },
        },
      }),
    );
    return {
      username: admin?.username,
      role: admin?.role,
      id: admin?.id,
      level: admin?.organization.level,
    };
  }
}
