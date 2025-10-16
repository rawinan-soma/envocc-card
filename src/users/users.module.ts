import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUserController } from './admin-user.controller';
import { FilesService } from 'src/files/files.service';
import { AdminsService } from 'src/admins/admins.service';

@Module({
  controllers: [UsersController, AdminUserController],
  providers: [UsersService, FilesService, AdminsService],
  exports: [UsersService],
})
export class UsersModule {}
