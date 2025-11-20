import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MembersService } from './members.service';

@Controller('common')
export class CommonMembersController {
  constructor(private readonly memberService: MembersService) {}

  @Get('qrcode')
  async qrcodeExistHandler(@Query('qrcode_number') qrcode_number: string) {
    return await this.memberService.getMemberByQrcode(qrcode_number);
  }

  @Post('qrcode/validate')
  async validateQrcodeHandler(
    @Body() { qrcode, password }: { qrcode: string; password: string },
  ) {
    return await this.memberService.validateQrCode(qrcode, password);
  }

  @Post('qrcode/verify')
  async verifyTokenHandler(@Query('token') token: string) {
    return await this.memberService.verifyToken(token);
  }
}
