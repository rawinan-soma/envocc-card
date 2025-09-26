import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RequestModule } from 'src/request/request.module';
import { MembersModule } from 'src/members/members.module';
import { FilesModule } from 'src/files/files.module';
import { AdminUserController } from './admin-user.controller';
import { AdminsModule } from 'src/admins/admins.module';

@Module({
  imports: [RequestModule, MembersModule, FilesModule, AdminsModule],
  controllers: [UsersController, AdminUserController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
