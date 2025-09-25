import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  Query,
  Delete,
  Patch,
  Body,
  Post,
  ParseIntPipe,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { GetAllUserQueryDto } from 'src/users/dto/get-all-user-query.dto';
import { UsersService } from 'src/users/users.service';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';
import { RequestService } from 'src/request/request.service';
import { MembersService } from 'src/members/members.service';
import { MemeberCreateDto as MemberCreateDto } from 'src/members/dto/create-member.dto';
import { FileModelMap, FilesService } from 'src/files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import { DocumentCreateDto } from 'src/common-documents/dto/document-create.dto';
import { CommonDocumentsService } from 'src/common-documents/common-documents.service';
import { OrgCreateDto } from 'src/organizations/dto/org-create.dto';
import { OrganizationService } from 'src/organizations/organization.service';
import { FileCreateDto } from 'src/files/dto/file-create.dto';
import { SignatureCreateDto } from 'src/signatures/dto/signature-create.dto';
import { SealsService } from 'src/seals/seals.service';
import { SignaturesService } from 'src/signatures/signatures.service';

@Controller('admins')
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly userService: UsersService,
    private readonly requestService: RequestService,
    private readonly membersService: MembersService,
    private readonly filesService: FilesService,
    private readonly documentsService: CommonDocumentsService,
    private readonly organizationService: OrganizationService,
    private readonly sealsService: SealsService,
    private readonly signatureService: SignaturesService,
  ) {}

  @Get('admins')
  async getAdminHandler(
    @Query('id') id?: number,
    @Query('username') username?: string,
    @Query('email') email?: string,
  ) {
    const queries = [id, username, email].filter(Boolean);
    if (queries.length > 1) {
      throw new BadRequestException(
        'bad request by user: query must be only 1 or null',
      );
    }

    if (id) {
      return this.adminsService.getAdminById(id);
    }
    if (username) {
      return this.adminsService.getAdminByUsername(username);
    }

    if (email) {
      return this.adminsService.getAdminByEmail(email);
    }

    return this.adminsService.getAllAdmins();
  }

  @UseGuards(JwtAccessGuardAdmin)
  @Get('me')
  async getCurrentAdminHandler(@Req() request: RequestwithAdminData) {
    return this.adminsService.getAdminById(Number(request.user.id));
  }

  @UseGuards(JwtAccessGuardAdmin)
  @Get('users')
  async getAllUserHandler(
    @Req() request: RequestwithAdminData,
    @Query() queryParams: GetAllUserQueryDto,
  ) {
    const admin = await this.adminsService.getAdminById(request.user.id);
    const { page, status, search_term } = queryParams;

    return await this.userService.getAllUsers({
      adminId: admin.id,
      orgId: admin.adminOnOrg[0].organization.id,
      page: page as number,
      status: status as string,
      search_term: search_term,
    });
  }

  // @Get('users/form/:id')
  // async getUserPrintFormHandler(@Param('id') id: number) {
  //   return await this.userService.getUserPrintForm(id);
  // }

  // @Get('users/exp/:id')
  // async getUserPrintExpHandler(@Param('id') id: number) {
  //   return await this.userService.getUserPrintExpForm(id);
  // }

  @Delete('users/:id')
  async deleteUserHandler(@Param('id') id: number) {
    return await this.userService.deleteUserById(id);
  }

  @Patch('users/validate/:id')
  async validateUserHandler(
    @Param('id') id: number,
    @Req() request: RequestwithAdminData,
  ) {
    const approver = request.user.id;
    return this.userService.validateUser(id, approver);
  }

  @Post('users/requests/update')
  async updateStatusHandler(
    @Req() request: RequestwithAdminData,
    @Body() updated: StatusCreateDto,
  ) {
    const approver = request.user.id;
    return await this.requestService.updateStatus(updated, approver);
  }

  @Get('members/:userId')
  async getMemberByIdHandler(@Param('userId', ParseIntPipe) userId: number) {
    return this.membersService.getMember(userId);
  }

  @Post('members')
  async createMemberHandler(@Body() dto: MemberCreateDto) {
    return this.membersService.transactionCreateMember(dto);
  }

  @Patch('members/:userId/deactivate')
  async deactivateMemberHandler(@Param('userId', ParseIntPipe) userId: number) {
    return this.membersService.deactivateMember(userId);
  }

  @Patch('members/:userId/activate')
  async activateMemberHandler(
    @Param('userId', ParseIntPipe) userId: number,
    @Body('startDate') startDate: string,
    @Req() request: RequestwithAdminData,
  ) {
    return this.membersService.transactionUpdateStartDate(
      userId,
      startDate,
      request.user.id,
    );
  }

  @Get('users/:userId/files/:file')
  async getUsersFilesHandler(
    @Param('file') file: keyof FileModelMap,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return await this.filesService.getFileByUserId(file, userId);
  }

  @Delete('users/:userId/files/:file')
  async deleteFilesHandler(
    @Param('file') file: keyof FileModelMap,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return await this.filesService.deleteFileByUserId(file, userId);
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('document', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createdDocumentHandler(
    @Param('file') file: Express.Multer.File,
    @Body() data: DocumentCreateDto,
  ) {
    return await this.documentsService.createDocument({
      ...data,
      doc_file: file.filename,
      url: file.path,
    });
  }

  @Delete('document/:docId')
  async deleteDocumentHandler(@Param() docId: number) {
    return await this.documentsService.deleteDocument(docId);
  }

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

  private createFileDtoMapper(user: number, filename: string, url: string) {
    const dto = new FileCreateDto();
    dto.userId = user;
    dto.file_name = filename;
    dto.url = url;

    return dto;
  }

  @Post('seals')
  @UseInterceptors(
    FileInterceptor('seal', getMulterOptions(['.png'], 10 * 1024 * 1024)),
  )
  async createSealHandler(
    @UploadedFile() seal: Express.Multer.File,
    @Req() request: RequestwithAdminData,
    @Body() seal_name: string,
  ) {
    const sealDto = this.createFileDtoMapper(
      request.user.id,
      seal.filename,
      seal.path,
    );

    const admin = await this.adminsService.getAdminById(request.user.id);

    return await this.sealsService.createAndUpdateSealTx(
      sealDto,
      admin.adminOnOrg[0].organization.id,
      seal_name,
    );
  }

  @Post('signatures')
  @UseInterceptors(
    FileInterceptor('signature', getMulterOptions(['.png'], 10 * 1024 * 1024)),
  )
  async createSignatureHandler(
    @UploadedFile() signature: Express.Multer.File,
    @Req() request: RequestwithAdminData,
    @Body() dto: SignatureCreateDto,
  ) {
    dto.filename = signature.filename;
    dto.url = signature.path;
    dto.admin = request.user.id;
    const admin = await this.adminsService.getAdminById(request.user.id);
    return await this.signatureService.createSignature(
      admin.adminOnOrg[0].organization.id,
      dto,
    );
  }
}
