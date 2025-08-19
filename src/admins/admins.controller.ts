import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AdminsService } from './admins.service';
import type { RequestwithUserData } from 'src/common/request-with-data.interface';
import { JwtAccessGuard } from 'src/admin-auth/jwt-access.guard';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  async getAllAdminsHandler() {
    return this.adminsService.getAllAdmins();
  }

  @Get(':username')
  async getAdminByUsernameHandler(@Param('username') username: string) {
    return this.adminsService.getAdminByUsername(username);
  }

  @Get(':id')
  async getAdminByIdHandler(@Param('id') id: number) {
    return this.adminsService.getAdminById(id);
  }

  @Get(':email')
  async getAdminByEmailHandler(@Param('email') email: string) {
    return this.adminsService.getAdminByEmail(email);
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async getCurrentAdminHandler(@Req() request: RequestwithUserData) {
    return this.adminsService.getAdminById(Number(request.user.id));
  }
}
