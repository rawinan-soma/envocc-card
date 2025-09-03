import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RequestModule } from 'src/request/request.module';
import { RequestService } from 'src/request/request.service';
import { MembersModule } from 'src/members/members.module';
import { MembersService } from 'src/members/members.service';

@Module({
  imports: [RequestModule, MembersModule],
  controllers: [UsersController],
  providers: [UsersService, RequestService, MembersService],
})
export class UsersModule {}
