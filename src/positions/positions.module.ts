import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';

@Module({
  providers: [PositionsService]
})
export class PositionsModule {}
