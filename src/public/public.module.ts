import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { CommonDocumentsModule } from 'src/common-documents/common-documents.module';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';

@Module({
  imports: [CommonDocumentsModule],
  controllers: [PublicController],
  providers: [PublicService, CommonDocumentsService],
})
export class PublicModule {}
