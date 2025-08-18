import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(
  Strategy,
  'admin-local',
) {
  constructor(private readonly service: AdminAuthService) {
    super({ usernameField: 'username' });
  }

  async validate(username: string, password: string) {
    return this.service.getAuthenticatedAdmin(username, password);
  }
}
