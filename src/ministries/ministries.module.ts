import { Module } from '@nestjs/common';
import { MinistriesService } from './ministries.service';

@Module({
  providers: [MinistriesService],
})
export class MinistriesModule {}
