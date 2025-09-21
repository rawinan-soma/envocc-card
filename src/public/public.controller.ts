import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';
import { OrganizationService } from 'src/organizations/organization.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly documentsService: CommonDocumentsService,
    private readonly organizationsService: OrganizationService,
  ) {}

  @Get('documents')
  async getDocumentsHandler(@Query('docId', ParseIntPipe) docId?: number) {
    if (docId) {
      return this.documentsService.getDocumentById(docId);
    }

    return this.documentsService.getAllDocuments();
  }

  // @Get('documents')
  // async getDocumentByIdHandler(@Query('docId', ParseIntPipe) docId: number) {
  //   return this.documentsService.getDocumentById(docId);
  // }

  @Get('organizations')
  async getOrganizationsHandler(@Query('q') q?: string) {
    return this.organizationsService.getOrganizationsOnQuery(q);
  }

  @Get('organizations/:id')
  async getOrgnizationByIdHandler(@Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.getOrganizationById(id);
  }
}
