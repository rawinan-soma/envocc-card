import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { AdminAuthService } from './admin-auth.service';
import { Request } from 'express';
import { TokenPayload } from 'src/shared/payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-admin',
) {
  constructor(
    private readonly config: ConfigService,
    private readonly service: AdminAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.Refresh as string;
        },
      ]),
      secretOrKey: config.get('REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(request: Request, payload: TokenPayload) {
    const refreshToken = request?.cookies?.Refresh as string;
    return this.service.getAdminFromRefreshToken(refreshToken, payload.id);
  }
}
