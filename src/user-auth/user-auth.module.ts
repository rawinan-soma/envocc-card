import { Module } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';
import { UserAuthController } from './user-auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UserLocalStrategy } from './user-local.strategy';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { PrismaService } from 'prisma/prisma.service';
import { CommonAuthService } from 'src/shared/common-auth.service';

@Module({
  imports: [PassportModule, JwtModule],
  controllers: [UserAuthController],
  providers: [
    UserAuthService,
    UserLocalStrategy,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    PrismaService,
    CommonAuthService,
  ],
})
export class UserAuthModule {}
