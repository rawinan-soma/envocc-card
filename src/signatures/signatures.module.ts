import { Module } from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { AdminSignatureController } from './admin-signature.controller';
import { AdminsService } from 'src/admins/admins.service';

@Module({
  providers: [SignaturesService, AdminsService],
  exports: [SignaturesService],
  controllers: [AdminSignatureController],
})
export class SignaturesModule {}
