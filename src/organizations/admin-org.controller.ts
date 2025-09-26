import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { OrgCreateDto } from './dto/org-create.dto';
import { AdminsService } from 'src/admins/admins.service';

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
    const seal = admin.adminOnOrg[0].organization.orgOnSeal[0].sealId;
    const signature =
      admin.adminOnOrg[0].organization.orgOnSignature[0].signatureId;
    const parent = admin.adminOnOrg[0].organization.id;

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
      admin.adminOnOrg[0].organization.id,
    );
  }
}
