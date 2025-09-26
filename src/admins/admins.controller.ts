import {
  Controller,
  Get,
  Req,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get('admins')
  async getAdminHandler(
    @Query('id') id?: number,
    @Query('username') username?: string,
    @Query('email') email?: string,
  ) {
    const queries = [id, username, email].filter(Boolean);
    if (queries.length > 1) {
      throw new BadRequestException(
        'bad request by user: query must be only 1 or null',
      );
    }

    if (id) {
      return this.adminsService.getAdminById(id);
    }
    if (username) {
      return this.adminsService.getAdminByUsername(username);
    }

    if (email) {
      return this.adminsService.getAdminByEmail(email);
    }

    return this.adminsService.getAllAdmins();
  }

  @UseGuards(JwtAccessGuardAdmin)
  @Get('me')
  async getCurrentAdminHandler(@Req() request: RequestwithAdminData) {
    return this.adminsService.getAdminById(Number(request.user.id));
  }
}
