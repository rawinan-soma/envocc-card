import { Module } from '@nestjs/common';
import { SealsService } from './seals.service';
import { AdminSealController } from './admin-seal.controller';
import { FilesService } from 'src/files/files.service';
import { AdminsService } from 'src/admins/admins.service';

@Module({
  controllers: [AdminSealController],
  providers: [SealsService, FilesService, AdminsService],
  exports: [SealsService],
})
export class SealsModule {}
