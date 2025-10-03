import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RequestService } from './request.service';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { StatusCreateDto } from './dto/status-create.dto';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminRequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post('users/requests/update')
  async updateStatusHandler(
    @Req() request: RequestwithAdminData,
    @Body() updated: StatusCreateDto,
  ) {
    const approver = request.user.id;
    return await this.requestService.updateStatus(updated, approver);
  }
}
