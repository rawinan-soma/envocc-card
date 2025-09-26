import { Module } from '@nestjs/common';
import { SealsService } from './seals.service';
import { AdminSealController } from './admin-seal.controller';

@Module({
  controllers: [AdminSealController],
  providers: [SealsService],
  exports: [SealsService],
})
export class SealsModule {}
