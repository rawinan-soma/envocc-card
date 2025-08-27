import { Module } from '@nestjs/common';
import { EnvcardService } from './envcard.service';
import { EnvcardController } from './envcard.controller';

@Module({
  controllers: [EnvcardController],
  providers: [EnvcardService],
})
export class EnvcardModule {}
