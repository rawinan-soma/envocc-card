import { Module } from '@nestjs/common';
import { CommonDocumentsService } from './common-documents.service';
import { FilesModule } from 'src/files/files.module';
// import { CommonDocumentsController } from './common-documents.controller';
import { PublicDocumentController } from './public-document.controller';
import { AdminDocumentController } from './admin-document.controller';
import { FilesService } from 'src/files/files.service';

@Module({
  providers: [CommonDocumentsService, FilesService],
  exports: [CommonDocumentsService],
  controllers: [PublicDocumentController, AdminDocumentController],
})
export class CommonDocumentsModule {}
