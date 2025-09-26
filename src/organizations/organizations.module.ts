import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { PublicOrgController } from './public-org.controller';
import { AdminOrgController } from './admin-org.controller';
import { AdminsService } from 'src/admins/admins.service';

@Module({
  providers: [OrganizationService, AdminsService],
  exports: [OrganizationService],
  controllers: [PublicOrgController, AdminOrgController],
})
export class OrganizationsModule {}
