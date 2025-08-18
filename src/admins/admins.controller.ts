import { Controller, Get, Param } from '@nestjs/common';
import { AdminsService } from './admins.service';

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
}
