import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { AdminMemberController } from './admin-member.controller';
import { UserMemberController } from './user-member.controller';
import { FilesService } from 'src/files/files.service';
import { AdminsService } from 'src/admins/admins.service';

@Module({
  providers: [MembersService, FilesService, AdminsService],
  exports: [MembersService],
  controllers: [AdminMemberController, UserMemberController],
})
export class MembersModule {}
