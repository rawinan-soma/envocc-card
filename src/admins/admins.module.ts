import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { UsersService } from 'src/users/users.service';
import { RequestModule } from 'src/request/request.module';
import { RequestService } from 'src/request/request.service';
import { MembersModule } from 'src/members/members.module';
import { MembersService } from 'src/members/members.service';

@Module({
  imports: [RequestModule, MembersModule],
  controllers: [AdminsController],
  providers: [AdminsService, UsersService, RequestService, MembersService],
})
export class AdminsModule {}
