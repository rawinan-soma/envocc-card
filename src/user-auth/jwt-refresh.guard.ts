import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuardUser extends AuthGuard('jwt-refresh-user') {}
