import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { FilesModule } from 'src/files/files.module';
import { AdminMemberController } from './admin-member.controller';

@Module({
  imports: [FilesModule],
  providers: [MembersService],
  exports: [MembersService],
  controllers: [AdminMemberController],
})
export class MembersModule {}
