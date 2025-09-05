import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminCreateDto } from './dto/admin-create.dto/admin-create.dto';
import { AdminLocalAuthenGuard } from './admin-local.guard';

import { CommonAuthService } from 'src/shared/common-auth.service';

import { JwtAccessGuardAdmin } from './jwt-access.guard';
import JwtRefreshGuardAdmin from './jwt-refresh.guard';
import type { RequestwithAdminData } from './request-admin.interface';

@Controller('admins/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly commonAuthService: CommonAuthService,
  ) {}

  @Post('register')
  async createAdminHandler(@Body() admin: AdminCreateDto) {
    const newAdmin = await this.adminAuthService.createAdmin(admin);

    return { msg: 'admin create', admin: newAdmin };
  }

  @HttpCode(200)
  @UseGuards(AdminLocalAuthenGuard)
  @Post('login')
  async loginHandler(@Req() request: RequestwithAdminData) {
    const { user } = request;
    const accessTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(user.id),
      'access',
    );

    const refreshTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(user.id),
      'refresh',
    );

    await this.adminAuthService.setCurrentRefreshToken(
      refreshTokenCookie,
      Number(user.id),
    );

    request.res?.cookie(
      'Authentication',
      accessTokenCookie,
      this.commonAuthService.getCookieOption('access'),
    );

    request.res?.cookie(
      'Refresh',
      refreshTokenCookie,
      this.commonAuthService.getCookieOption('refresh'),
    );

    this.logger.log(`user: ${user.id}, role: ${user.role} logged in`);

    return {
      msg: 'login succesful',
      id: Number(user.id),
      role: user.role,
    };
  }

  @UseGuards(JwtRefreshGuardAdmin)
  @Post('refresh')
  @HttpCode(200)
  refreshTokenHandler(@Req() request: RequestwithAdminData) {
    const accessTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(request.user.id),
      'access',
    );

    request.res?.cookie(
      'Authentication',
      accessTokenCookie,
      this.commonAuthService.getCookieOption('access'),
    );

    this.logger.log(
      `user: ${request.user.id},  role: ${request.user.role} refreshed cookie`,
    );

    return {
      msg: 'token refreshed',
      id: Number(request.user.id),
      role: request.user.role,
    };
  }

  @HttpCode(200)
  @UseGuards(JwtAccessGuardAdmin)
  @Post('logout')
  async logoutHandler(@Req() request: RequestwithAdminData) {
    await this.adminAuthService.removeRefreshToken(Number(request.user.id));

    request.res?.clearCookie('Authentication');

    request.res?.clearCookie('Refresh');

    this.logger.log(
      `user: ${request.user.id},  role: ${request.user.role} logged out`,
    );

    return { msg: 'logout succesful' };
  }
}
