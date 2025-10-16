import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { OrgCreateDto } from './dto/org-create.dto';
import { AdminsService } from 'src/admins/admins.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';

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

    return await this.organizationService.createOrganization(
      dto,
      seal,
      signature,
      parent,
    );
  }

  @Get('organizations')
  async getOrgChildrenHandler(@Req() request: RequestwithAdminData) {
    const admin = await this.adminsService.getAdminById(request.user.id);
    return await this.organizationService.getOrganizationChildren(
      admin.organization.id,
    );
  }
}
