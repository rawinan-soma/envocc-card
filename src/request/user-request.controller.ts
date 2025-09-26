import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { RequestService } from './request.service';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { StatusCreateDto } from './dto/status-create.dto';

@Controller('users')
export class UserRequestController {
  constructor(private readonly requestService: RequestService) {}

  @Get('me/requests/latest')
  async getCurrentStatusHandler(@Req() request: RequestwithUserData) {
    return this.requestService.getCurrentStatus(request.user.id);
  }

  @Post('me/requests')
  async updateStatusHandler(
    @Req() request: RequestwithUserData,
    @Body() updated: StatusCreateDto,
  ) {
    const approver = request.user.id;
    return this.requestService.updateStatus(updated, approver);
  }
}
