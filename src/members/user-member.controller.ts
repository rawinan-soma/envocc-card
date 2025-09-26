import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { MembersService } from './members.service';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';

@Controller('user-member')
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
