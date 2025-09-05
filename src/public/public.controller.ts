import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly documentsService: CommonDocumentsService,
  ) {}

  @Get('documents')
  async getAllDocumentsHandler() {
    return this.documentsService.getAllDocuments();
  }

  @Get('documents')
  async getDocumentByIdHandler(@Query('docId', ParseIntPipe) docId: number) {
    return this.documentsService.getDocumentById(docId);
  }
}
