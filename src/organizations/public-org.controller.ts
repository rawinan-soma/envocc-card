import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { OrganizationService } from './organization.service';

@Controller('public')
export class PublicOrgController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('organizations')
  async getOrganizationsHandler(@Query('q') q?: string) {
    return await this.organizationService.getOrganizationsOnQuery(q);
  }

  @Get('organizations/:id')
  async getOrgnizationByIdHandler(@Param('id', ParseIntPipe) id: number) {
    return await this.organizationService.getOrganizationById(id);
  }
}
