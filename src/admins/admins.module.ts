import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { UsersService } from 'src/users/users.service';
import { RequestModule } from 'src/request/request.module';
import { RequestService } from 'src/request/request.service';
import { MembersModule } from 'src/members/members.module';
import { MembersService } from 'src/members/members.service';
import { CommonDocumentsModule } from '../common-documents/common-documents.module';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { OrganizationService } from 'src/organizations/organization.service';

@Module({
  imports: [
    RequestModule,
    MembersModule,
    CommonDocumentsModule,
    OrganizationsModule,
  ],
  controllers: [AdminsController],
  providers: [
    AdminsService,
    UsersService,
    RequestService,
    MembersService,
    CommonDocumentsService,
    OrganizationService,
  ],
  exports: [AdminsService],
})
export class AdminsModule {}
