import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { CommonDocumentsModule } from 'src/common-documents/common-documents.module';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { OrganizationService } from 'src/organizations/organization.service';
import { PositionsModule } from 'src/positions/positions.module';
import { PositionsService } from 'src/positions/positions.service';
import { MembersModule } from 'src/members/members.module';
import { MembersService } from 'src/members/members.service';

@Module({
  imports: [
    CommonDocumentsModule,
    OrganizationsModule,
    PositionsModule,
    MembersModule,
  ],
  controllers: [PublicController],
  providers: [
    PublicService,
    CommonDocumentsService,
    OrganizationService,
    PositionsService,
    MembersService,
  ],
})
export class PublicModule {}
