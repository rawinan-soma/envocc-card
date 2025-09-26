import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { MemeberCreateDto } from './dto/create-member.dto';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';

@Controller('admins')
export class AdminMemberController {
  constructor(private readonly membersService: MembersService) {}

  @Get('members/:userId')
  async getMemberByIdHandler(@Param('userId', ParseIntPipe) userId: number) {
    return this.membersService.getMember(userId);
  }

  @Post('members')
  async createMemberHandler(@Body() dto: MemeberCreateDto) {
    return this.membersService.transactionCreateMember(dto);
  }

  @Patch('members/:userId/deactivate')
  async deactivateMemberHandler(@Param('userId', ParseIntPipe) userId: number) {
    return this.membersService.deactivateMember(userId);
  }

  @Patch('members/:userId/activate')
  async activateMemberHandler(
    @Param('userId', ParseIntPipe) userId: number,
    @Body('startDate') startDate: string,
    @Req() request: RequestwithAdminData,
  ) {
    return this.membersService.transactionUpdateStartDate(
      userId,
      startDate,
      request.user.id,
    );
  }
}
