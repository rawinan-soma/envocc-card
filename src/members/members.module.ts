import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { FilesModule } from 'src/files/files.module';
import { AdminMemberController } from './admin-member.controller';
import { UserMemberController } from './user-member.controller';

@Module({
  imports: [FilesModule],
  providers: [MembersService],
  exports: [MembersService],
  controllers: [AdminMemberController, UserMemberController],
})
export class MembersModule {}
