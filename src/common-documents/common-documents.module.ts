import { Module } from '@nestjs/common';
import { CommonDocumentsService } from './common-documents.service';
import { CommonDocumentsController } from './common-documents.controller';

@Module({
  controllers: [CommonDocumentsController],
  providers: [CommonDocumentsService],
})
export class CommonDocumentsModule {}
