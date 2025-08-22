import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { UsersService } from 'src/users/users.service';
import { RequestService } from '../request/request.service';
import { RequestModule } from 'src/request/request.module';

@Module({
  imports: [RequestModule],
  controllers: [AdminsController],
  providers: [AdminsService, UsersService, RequestService],
})
export class AdminsModule {}
