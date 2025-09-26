import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { AdminRequestController } from './admin-request.controller';

@Module({
  providers: [RequestService],
  exports: [RequestService],
  controllers: [AdminRequestController],
})
export class RequestModule {}
