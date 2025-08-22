import {
  Controller,
  Req,
  UseGuards,
  Get,
  Patch,
  Body,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateDto } from './dto/user-update.dto';
import { RequestService } from 'src/request/request.service';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly requestService: RequestService,
  ) {}

  @UseGuards(JwtAccessGuardUser)
  @Get('me')
  async getCurrentUserHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserById(Number(request.user.id));
  }

  @Patch()
  async updateUserHandler(
    @Req() request: RequestwithUserData,
    @Body() user: UserUpdateDto,
  ) {
    return this.usersService.updateUser(request.user.id, user);
  }

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
