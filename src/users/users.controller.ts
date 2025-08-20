import { Controller, Req, UseGuards, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuardUser)
  @Get('me')
  async getCurrentUserHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserById(Number(request.user.id));
  }
}
