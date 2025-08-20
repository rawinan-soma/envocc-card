import { Controller, Req, UseGuards, Get, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateDto } from './dto/user-update.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
