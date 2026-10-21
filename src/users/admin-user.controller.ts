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
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminsService } from 'src/admins/admins.service';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import {
  GetAllUserQueryDto,
  GetUsersPageQueryDto,
} from './dto/get-all-user-query.dto';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import { MinistryAdminGuard } from 'src/admin-auth/ministry-admin.guard';
import { PrismaService } from 'prisma/prisma.service';
import { assertUserInOrg } from 'src/organizations/user-org-scope';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminUserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminsService: AdminsService,
    private readonly prisma: PrismaService,
  ) {}

  // Declared before any users/:id GET so it is never shadowed by one.
  // Lists every user system-wide, so only ministry-level admins may call it.
  @Get('users/all')
  @UseGuards(MinistryAdminGuard)
  async getAllUsersUnfilteredHandler(
    @Query() queryParams: GetUsersPageQueryDto,
  ) {
    const { page, search_term } = queryParams;

    return await this.usersService.getAllUsersUnfiltered({
      page: page as number,
      search_term: search_term,
    });
  }

  @Get('users')
  async getAllUserHandler(
    @Req() request: RequestwithAdminData,
    @Query() queryParams: GetAllUserQueryDto,
  ) {
    const admin = await this.adminsService.getAdminById(request.user.id);
    const { page, status, search_term } = queryParams;

    return await this.usersService.getAllUsers({
      adminId: admin.id,
      orgId: admin.organization.id,
      page: page as number,
      status: status as string,
      search_term: search_term,
    });
  }

  // Same response as the user's own GET users/me/requests/form, for any user
  // in the admin's organization or one below it.
  @Get('users/:userId/requests/form')
  async getUserRequestFormHandler(
    @Req() request: RequestwithAdminData,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.assertInAdminOrg(request.user.id, userId);
    return await this.usersService.getUserRequestForm(userId);
  }

  @Get('users/:userId/requests/exp')
  async getUserExpFormHandler(
    @Req() request: RequestwithAdminData,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.assertInAdminOrg(request.user.id, userId);
    return await this.usersService.getUserPrintExpForm(userId);
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

  private async assertInAdminOrg(adminId: number, userId: number) {
    const admin = await this.adminsService.getAdminById(adminId);
    await assertUserInOrg(this.prisma, admin.organization.id, userId);
  }
}
