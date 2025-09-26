import { Controller, Get, Query } from '@nestjs/common';
import { CommonDocumentsService } from './common-documents.service';

@Controller('public')
export class PublicDocumentController {
  constructor(private readonly commondocService: CommonDocumentsService) {}

  @Get('documents')
  async getDocumentsHandler(@Query('docId') docId?: number) {
    if (docId) {
      return await this.commondocService.getDocumentById(docId);
    }

    return await this.commondocService.getAllDocuments();
  }
}
