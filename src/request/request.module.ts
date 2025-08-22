import { Module } from '@nestjs/common';
import { RequestService } from './request.service';

@Module({
  imports: [],
  providers: [RequestService],
})
export class RequestModule {}
