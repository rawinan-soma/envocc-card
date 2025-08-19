import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UserAuthService } from './user-auth.service';

@Injectable()
export class UserLocalStrategy extends PassportStrategy(
  Strategy,
  'user-local',
) {
  constructor(private readonly service: UserAuthService) {
    super({ usernameField: 'username' });
  }

  async validate(username: string, password: string) {
    return this.service.getAuthenticatedUser(username, password);
  }
}
