import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { PublicOrgController } from './public-org.controller';
import { AdminOrgController } from './admin-org.controller';
import { AdminsModule } from 'src/admins/admins.module';

@Module({
  imports: [AdminsModule],
  providers: [OrganizationService],
  exports: [OrganizationService],
  controllers: [PublicOrgController, AdminOrgController],
})
export class OrganizationsModule {}
