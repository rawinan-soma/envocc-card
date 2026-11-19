import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileModelMap, FilesService } from './files.service';
import { fileDto } from './dto/file-create.dto';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import { MophAdminGuard } from 'src/admin-auth/ministry-admin.guard';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { getMulterOptions } from 'src/shared/file-multer-options';
import { PrismaService } from 'prisma/prisma.service';
import { assertUserInAdminOrg } from 'src/organizations/user-org-scope';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminFileController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  // Lists envcard files across every user, so only MOPH admins may call it.
  @Get('files/envcard')
  @UseGuards(MophAdminGuard)
  async listEnvcardFilesHandler(
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ) {
    return await this.filesService.listEnvcardFiles(userId);
  }

  // Document upload on behalf of a user. No status gate: an admin may attach
  // documents at any Request Status.
  @Post('users/:userId/files')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'requestFile', maxCount: 1 },
        { name: 'govCard', maxCount: 1 },
        { name: 'experienceForm', maxCount: 1 },
        { name: 'policeReport', maxCount: 1 },
      ],
      getMulterOptions(['.pdf'], 10 * 1024 * 1024),
    ),
  )
  async uploadFilesHandler(
    @UploadedFiles()
    files: {
      requestFile?: Express.Multer.File[];
      govCard?: Express.Multer.File[];
      experienceForm?: Express.Multer.File[];
      policeReport?: Express.Multer.File[];
    },
    @Param('userId', ParseIntPipe) userId: number,
    @Req() request: RequestwithAdminData,
  ) {
    const adminId = request.user.id;
    return await this.filesService.uploadDocuments('admin', userId, {
      govcard: fileDto(files?.govCard?.[0], userId, adminId),
      reqFile: fileDto(files?.requestFile?.[0], userId, adminId),
      expfile: fileDto(files?.experienceForm?.[0], userId, adminId),
      policeReport: fileDto(files?.policeReport?.[0], userId, adminId),
    });
  }

  // Declared before users/:userId/files/:file, which would serve it to any
  // admin: only admins of the user's organization or one above it read it.
  @Get('users/:userId/files/policeReport')
  async getPoliceReportHandler(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() request: RequestwithAdminData,
  ) {
    await assertUserInAdminOrg(this.prisma, request.user.id, userId);
    return await this.filesService.getFileByUserId('policeReport', userId);
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
}
