import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { CommonDocumentsModule } from 'src/common-documents/common-documents.module';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { OrganizationService } from 'src/organizations/organization.service';

@Module({
  imports: [CommonDocumentsModule, OrganizationsModule],
  controllers: [PublicController],
  providers: [PublicService, CommonDocumentsService, OrganizationService],
})
export class PublicModule {}
