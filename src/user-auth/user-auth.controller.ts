import {
  Controller,
  HttpCode,
  Logger,
  UseGuards,
  Req,
  Post,
  Body,
} from '@nestjs/common';
import { UserAuthService } from './user-auth.service';
import { CommonAuthService } from 'src/common/common-auth.service';
import { UserLocalAuthenGuard } from './user-local.guard';
import { JwtAccessGuardUser } from './jwt-access.guard';
import { JwtRefreshGuardUser } from './jwt-refresh.guard';
import { UserExpCreateDto } from './dto/user-exp-create.dto';
import type { RequestwithUserData } from './request-user-interface';

@Controller('users/auth')
export class UserAuthController {
  private readonly logger = new Logger(UserAuthController.name);
  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly commonAuthService: CommonAuthService,
  ) {}

  @HttpCode(200)
  @UseGuards(UserLocalAuthenGuard)
  @Post('login')
  async loginHandler(@Req() request: RequestwithUserData) {
    const { user } = request;
    const accessTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(user.id),
      'access',
    );

    const refreshTokenCookie = this.commonAuthService.getCookieFromToken(
      Number(user.id),
      'refresh',
    );

    await this.userAuthService.setCurrentRefreshToken(
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

    this.logger.log(`user: ${user.id},  role: ${user.role} logged in`);

    return { msg: 'login succesful' };
  }

  @UseGuards(JwtRefreshGuardUser)
  @Post('refresh')
  @HttpCode(200)
  refreshTokenHandler(@Req() request: RequestwithUserData) {
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
      `user: ${request.user.id}, role: ${request.user.role} refresh token`,
    );
  }

  @HttpCode(200)
  @UseGuards(JwtAccessGuardUser)
  @Post('logout')
  async logoutHandler(@Req() request: RequestwithUserData) {
    await this.userAuthService.removeRefreshToken(Number(request.user.id));
    request.res?.clearCookie('Authentication');
    request.res?.clearCookie('Refresh');

    this.logger.log(
      `user: ${request.user.id}, role: ${request.user.role} logged out`,
    );

    return { msg: 'logout succesful' };
  }

  @Post('register')
  async createUserHandler(@Body() user: UserExpCreateDto) {
    const newUser = await this.userAuthService.createUser(user);
    return { msg: 'user created', user: newUser };
  }
}
