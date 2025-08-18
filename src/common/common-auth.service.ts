import { Injectable } from '@nestjs/common';
import { TokenPayload } from './payload.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommonAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  public getCookieFromToken(id: number, tokenType: 'access' | 'refresh') {
    const secretKey =
      tokenType === 'access' ? 'ACCESS_TOKEN_SECRET' : 'REFRESH_TOKEN_SECRET';
    const expKey =
      tokenType === 'access' ? 'ACCESS_TOKEN_EXP' : 'REFRESH_TOKEN_EXP';
    const payload: TokenPayload = { id: id };
    const token = this.jwt.sign(payload, {
      secret: this.config.get(secretKey),
      expiresIn: `${this.config.get(expKey)}s`,
    });

    return token;
  }

  public getCookieOption(tokenType: 'access' | 'refresh' | 'logout') {
    const expKey =
      tokenType === 'access' ? 'ACCESS_TOKEN_EXP' : 'REFRESH_TOKEN_EXP';

    if (tokenType === 'logout') {
      return {
        httpOnly: true,
        path: '/',
        maxAge: 0,
        secure: false,
      };
    }

    return {
      httpOnly: true,
      path: '/',
      maxAge: Number(this.config.get<string>(expKey)) * 1000,
      sameSite: 'lax' as const,
      secure: false,
    };
  }
}
