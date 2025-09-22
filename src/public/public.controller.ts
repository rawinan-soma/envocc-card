import {
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PublicService } from './public.service';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';
import { OrganizationService } from 'src/organizations/organization.service';
import { PositionsService } from 'src/positions/positions.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly documentsService: CommonDocumentsService,
    private readonly organizationsService: OrganizationService,
    private readonly positionsService: PositionsService,
  ) {}

  @Get('documents')
  async getDocumentsHandler(@Query('docId', ParseIntPipe) docId?: number) {
    if (docId) {
      return await this.documentsService.getDocumentById(docId);
    }

    return await this.documentsService.getAllDocuments();
  }

  // @Get('documents')
  // async getDocumentByIdHandler(@Query('docId', ParseIntPipe) docId: number) {
  //   return this.documentsService.getDocumentById(docId);
  // }

  @Get('organizations')
  async getOrganizationsHandler(@Query('q') q?: string) {
    return await this.organizationsService.getOrganizationsOnQuery(q);
  }

  @Get('organizations/:id')
  async getOrgnizationByIdHandler(@Param('id', ParseIntPipe) id: number) {
    return await this.organizationsService.getOrganizationById(id);
  }

  @Get('positions')
  async getAllPositionQuery(@Query('orgId') orgId?: number) {
    return await this.positionsService.getAllPositions(orgId);
  }

  @Get('positions/:id')
  async getPositionById(@Param('id', ParseIntPipe) id: number) {
    return await this.positionsService.getNonExecutiveById(id);
  }

  @Get('positionLevels')
  async getAllPositionLevels(
    @Query('executive', ParseBoolPipe) executive: boolean,
  ) {
    return await this.positionsService.getAllPositionLevels(executive);
  }

  @Get('positionLevels/:id')
  async getPositionLevelById(@Param('id', ParseIntPipe) id: number) {
    return await this.positionsService.getPositionLevelById(id);
  }
}
