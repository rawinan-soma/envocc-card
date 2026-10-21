import { Module } from '@nestjs/common';
import { SealsService } from './seals.service';
import { AdminSealController } from './admin-seal.controller';
import { AdminsService } from 'src/admins/admins.service';

@Module({
  controllers: [AdminSealController],
  providers: [SealsService, AdminsService],
  exports: [SealsService],
})
export class SealsModule {}
