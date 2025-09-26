import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { AdminRequestController } from './admin-request.controller';
import { UserRequestController } from './user-request.controller';

@Module({
  providers: [RequestService],
  exports: [RequestService],
  controllers: [AdminRequestController, UserRequestController],
})
export class RequestModule {}
