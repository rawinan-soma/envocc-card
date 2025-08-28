import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  Query,
  Delete,
  Patch,
  Body,
  Post,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { GetAllUserQueryDto } from 'src/users/dto/get-all-user-query.dto';
import { UsersService } from 'src/users/users.service';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';
import { RequestService } from 'src/request/request.service';

@Controller('admins')
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly userService: UsersService,
    private readonly requestService: RequestService,
  ) {}

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

  @UseGuards(JwtAccessGuardAdmin)
  @Get('me')
  async getCurrentAdminHandler(@Req() request: RequestwithAdminData) {
    return this.adminsService.getAdminById(Number(request.user.id));
  }

  @Get('users')
  async getAllUserHandler(
    @Req() request: RequestwithAdminData,
    @Query() queryParams: GetAllUserQueryDto,
  ) {
    const { page, status, fname_th, lname_th, institution_name } = queryParams;
    const pageNumber = page === 0 || !page ? 1 : queryParams.page;
    const adminLevel = request.user.level;
    const adminInst = request.user.institution;

    return await this.userService.getAllUsers({
      adminInst: adminInst,
      adminLevel: adminLevel,
      page: pageNumber as number,
      status: status as string,
      fname_th: fname_th,
      institution_name: institution_name,
      lname_th: lname_th,
    });
  }

  @Get('users/form/:id')
  async getUserPrintFormHandler(@Param('id') id: number) {
    return await this.userService.getUserPrintForm(id);
  }

  @Get('users/exp/:id')
  async getUserPrintExpHandler(@Param('id') id: number) {
    return await this.userService.getUserPrintExpForm(id);
  }

  @Delete(':id')
  async deleteUserHandler(@Param('id') id: number) {
    return await this.userService.deleteUserById(id);
  }

  @Patch('users/validate/:id')
  async validateUserHandler(
    @Param('id') id: number,
    @Req() request: RequestwithAdminData,
  ) {
    const approver = request.user.id;
    return this.userService.validateUser(id, approver);
  }

  @Post('users/requests/update')
  async updateStatusHandler(
    @Req() request: RequestwithAdminData,
    @Body() updated: StatusCreateDto,
  ) {
    const approver = request.user.id;
    return await this.requestService.updateStatus(updated, approver);
  }

  // TODO: Map controller to all files (Delete)
}
