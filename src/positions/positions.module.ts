import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { PublicPositionController } from './public-position.controller';

@Module({
  providers: [PositionsService],
  exports: [PositionsService],
  controllers: [PublicPositionController],
})
export class PositionsModule {}
