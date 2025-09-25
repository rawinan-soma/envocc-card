import { Module } from '@nestjs/common';
import { SealsService } from './seals.service';

@Module({
  controllers: [],
  providers: [SealsService],
  exports: [SealsService],
})
export class SealsModule {}
