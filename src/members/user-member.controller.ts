import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';

@UseGuards(JwtAccessGuardUser)
@Controller('users')
export class UserMemberController {
  constructor(private readonly membersService: MembersService) {}

  @Patch('me/members/qrcode')
  async setQRPasswordHandler(
    @Body('password') password: string,
    @Req() request: RequestwithUserData,
  ) {
    return this.membersService.setQrPassword(request.user.id, password);
  }

  @Get('me/envcard/qrcode')
  async getMemberForOnlineCardHandler(@Req() request: RequestwithUserData) {
    return this.membersService.getMember(request.user.id);
  }
}
