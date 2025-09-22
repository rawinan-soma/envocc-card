import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { CommonDocumentsModule } from 'src/common-documents/common-documents.module';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { OrganizationService } from 'src/organizations/organization.service';
import { PositionsModule } from 'src/positions/positions.module';
import { PositionsService } from 'src/positions/positions.service';

@Module({
  imports: [CommonDocumentsModule, OrganizationsModule, PositionsModule],
  controllers: [PublicController],
  providers: [
    PublicService,
    CommonDocumentsService,
    OrganizationService,
    PositionsService,
  ],
})
export class PublicModule {}
