import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [AdminsController],
  providers: [AdminsService, UsersService],
})
export class AdminsModule {}
