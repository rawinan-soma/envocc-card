import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RequestModule } from 'src/request/request.module';
import { RequestService } from 'src/request/request.service';

@Module({
  imports: [RequestModule],
  controllers: [UsersController],
  providers: [UsersService, RequestService],
})
export class UsersModule {}
