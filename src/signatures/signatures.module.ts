import { Module } from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { AdminSignatureController } from './admin-signature.controller';

@Module({
  providers: [SignaturesService],
  exports: [SignaturesService],
  controllers: [AdminSignatureController],
})
export class SignaturesModule {}
