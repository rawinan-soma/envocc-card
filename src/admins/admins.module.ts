import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { UsersService } from 'src/users/users.service';
import { RequestModule } from 'src/request/request.module';
import { RequestService } from 'src/request/request.service';

@Module({
  imports: [RequestModule],
  controllers: [AdminsController],
  providers: [AdminsService, UsersService, RequestService],
})
export class AdminsModule {}
