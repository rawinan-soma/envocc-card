import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { OrgCreateDto } from './dto/org-create.dto';
import { AdminsService } from 'src/admins/admins.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import { OrgUpdateDto } from './dto/org-update.dto';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminOrgController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly adminsService: AdminsService,
  ) {}

  @Post('organizations')
  async createOrganizationHandler(
    @Req() request: RequestwithAdminData,
    @Body() dto: OrgCreateDto,
  ) {
    const admin = await this.adminsService.getAdminById(request.user.id);
    const seal = admin.organization.sealId;
    const signature = admin.organization.signatureId;
    const parent = admin.organization.id;
    dto.provinceId = admin.organization.provinceId!;

    return await this.organizationService.createOrganization(
      dto,
      seal,
      signature,
      parent,
    );
  }

  @Get('organizations')
  async getOrgChildrenHandler(
    @Req() request: RequestwithAdminData,
    @Query('page') page: number,
    @Query('ministry', ParseBoolPipe) ministry?: boolean,
  ) {
    if (ministry) {
      return await this.organizationService.getAllOrganization(page);
    } else {
      const admin = await this.adminsService.getAdminById(request.user.id);
      return await this.organizationService.getOrganizationChildren(
        admin.organization.id,
        page,
      );
    }
  }

  // TODO: PATCH
  @Patch('organizations/:orgId')
  async updateOrganizationHandler(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() dto: OrgUpdateDto,
  ) {
    return await this.organizationService.updateOrganization(orgId, dto);
  }
}
