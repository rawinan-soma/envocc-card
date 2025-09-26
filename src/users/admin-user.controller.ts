import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminsService } from 'src/admins/admins.service';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { GetAllUserQueryDto } from './dto/get-all-user-query.dto';

@Controller('admins')
export class AdminUserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminsService: AdminsService,
  ) {}

  // @UseGuards(JwtAccessGuardAdmin)
  @Get('users')
  async getAllUserHandler(
    @Req() request: RequestwithAdminData,
    @Query() queryParams: GetAllUserQueryDto,
  ) {
    const admin = await this.adminsService.getAdminById(request.user.id);
    const { page, status, search_term } = queryParams;

    return await this.usersService.getAllUsers({
      adminId: admin.id,
      orgId: admin.adminOnOrg[0].organization.id,
      page: page as number,
      status: status as string,
      search_term: search_term,
    });
  }

  @Delete('users/:id')
  async deleteUserHandler(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.deleteUserById(id);
  }

  @Patch('users/validate/:id')
  async validateUserHandler(
    @Param('id') id: number,
    @Req() request: RequestwithAdminData,
  ) {
    const approver = request.user.id;
    return await this.usersService.validateUser(id, approver);
  }
}
