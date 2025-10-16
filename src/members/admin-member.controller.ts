import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { MemeberCreateDto } from './dto/create-member.dto';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import { AdminsService } from 'src/admins/admins.service';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminMemberController {
  constructor(
    private readonly membersService: MembersService,
    private readonly adminsService: AdminsService,
  ) {}

  @Get('members/:userId')
  async getMemberByIdHandler(@Param('userId', ParseIntPipe) userId: number) {
    return this.membersService.getMember(userId);
  }

  @Post('members')
  async createMemberHandler(
    @Req() request: RequestwithAdminData,
    @Body() dto: MemeberCreateDto,
  ) {
    dto.signatureId = (
      await this.adminsService.getAdminById(request.user.id)
    ).organization.signatureId;
    return this.membersService.transactionCreateMember(dto, request.user.id);
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
