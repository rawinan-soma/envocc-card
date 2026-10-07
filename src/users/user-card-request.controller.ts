import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { ValidatedUser } from 'src/user-auth/validated-user.decorator';
import { UserUpdateDto } from './dto/user-update.dto';

@ValidatedUser()
@Controller('users')
export class UserCardRequestController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/requests/form')
  async createRequestFormHandler(@Req() request: RequestwithUserData) {
    const id = request.user.id;
    return this.usersService.getUserRequestForm(id);
  }

  @Get('me/requests/exp')
  async createExpFormHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserPrintExpForm(request.user.id);
  }

  @Post('me/card')
  async createNewCardRequestHandler(
    @Req() request: RequestwithUserData,
    @Body() user: UserUpdateDto,
    @Query('requestType', ParseIntPipe) requestType: number,
  ) {
    return this.usersService.createNewCardRequest(
      request.user.id,
      user,
      requestType,
    );
  }
}
