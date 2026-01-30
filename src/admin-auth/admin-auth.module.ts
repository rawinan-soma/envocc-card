import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AdminLocalStrategy } from './admin-local.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { CommonAuthService } from 'src/shared/common-auth.service';
import { PrismaModule } from 'prisma/prisma.module';
import { AdminsService } from 'src/admins/admins.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [PassportModule, JwtModule, PrismaModule, MailModule],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminLocalStrategy,
    JwtRefreshStrategy,
    JwtAccessStrategy,
    CommonAuthService,
    AdminsService,
  ],
})
export class AdminAuthModule {}
