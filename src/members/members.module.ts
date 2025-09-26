import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { AdminMemberController } from './admin-member.controller';
import { UserMemberController } from './user-member.controller';
import { FilesService } from 'src/files/files.service';

@Module({
  providers: [MembersService, FilesService],
  exports: [MembersService],
  controllers: [AdminMemberController, UserMemberController],
})
export class MembersModule {}
