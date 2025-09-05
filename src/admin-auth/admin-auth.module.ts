import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AdminLocalStrategy } from './admin-local.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { PrismaService } from 'prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CommonAuthService } from 'src/shared/common-auth.service';

@Module({
  imports: [PassportModule, JwtModule],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminLocalStrategy,
    JwtRefreshStrategy,
    JwtAccessStrategy,
    PrismaService,
    ConfigService,
    CommonAuthService,
  ],
})
export class AdminAuthModule {}
