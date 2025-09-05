import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'prisma/prisma.service';
import { TokenPayload } from 'src/shared/payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access-user',
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
    return this.prisma.users.findUnique({
      where: { id: payload.id },
      select: { username: true, role: true, id: true },
    });
  }
}
