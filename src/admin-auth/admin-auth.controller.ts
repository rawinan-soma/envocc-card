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

import { CommonAuthService } from 'src/common/common-auth.service';
import type { RequestwithUserData } from 'src/common/request-with-data.interface';
import JwtRefreshGuard from './jwt-refresh.guard';
import { JwtAccessGuard } from './jwt-access.guard';

@Controller('admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly commonAuthService: CommonAuthService,
  ) {}

  @Post('register')
  async createAdminHandler(@Body() admin: AdminCreateDto) {
    const newAdmin = await this.adminAuthService.creatAdmin(admin);

    return { msg: 'admin create', admin: newAdmin };
  }

  @HttpCode(200)
  @UseGuards(AdminLocalAuthenGuard)
  @Post('login')
  async loginHandler(@Req() request: RequestwithUserData) {
    const { userData } = request;
    const accessTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(userData.id),
      'access',
    );
    const refreshTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(userData.id),
      'refresh',
    );

    await this.adminAuthService.setCurrentRefreshToken(
      refreshTokenCookie,
      Number(userData.id),
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

    this.logger.log(
      `user: ${userData.id}, username: ${userData.username},  role: ${userData.role} logged in`,
    );

    return {
      msg: 'login succesful',
      id: Number(userData.id),
      role: userData.role,
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(200)
  refreshTokenHandler(@Req() request: RequestwithUserData) {
    const accessTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(request.userData.id),
      'access',
    );

    request.res?.cookie(
      'Authentication',
      accessTokenCookie,
      this.commonAuthService.getCookieOption('access'),
    );

    this.logger.log(
      `user: ${request.userData.id}, username:${request.userData.username} role: ${request.userData.role} refreshed cookie`,
    );

    return { msg: 'token refreshed' };
  }

  @HttpCode(200)
  @UseGuards(JwtAccessGuard)
  @Post('logout')
  async logoutHandler(@Req() request: RequestwithUserData) {
    await this.adminAuthService.removeRefreshToken(Number(request.userData.id));

    request.res?.cookie(
      'Authentication',
      '',
      this.commonAuthService.getCookieOption('logout'),
    );

    request.res?.clearCookie('Refresh');

    this.logger.log(
      `user: ${request.userData.id}, username: ${request.userData.username}, role: ${request.userData.role} logged out`,
    );

    return { msg: 'logout succesful' };
  }
}
