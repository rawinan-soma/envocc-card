import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { AdminMemberController } from './admin-member.controller';
import { UserMemberController } from './user-member.controller';
import { FilesService } from 'src/files/files.service';
import { AdminsService } from 'src/admins/admins.service';
import { CommonMembersController } from './common-members.controller';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [MembersService, FilesService, AdminsService],
  exports: [MembersService],
  controllers: [
    AdminMemberController,
    UserMemberController,
    CommonMembersController,
  ],
})
export class MembersModule {}
