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
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import { MophAdminGuard } from 'src/admin-auth/ministry-admin.guard';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { getMulterOptions } from 'src/shared/file-multer-options';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminFileController {
  constructor(private readonly filesService: FilesService) {}

  // Lists envcard files across every user, so only MOPH admins may call it.
  @Get('files/envcard')
  @UseGuards(MophAdminGuard)
  async listEnvcardFilesHandler(
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ) {
    return await this.filesService.listEnvcardFiles(userId);
  }

  // Step 3 upload on behalf of a user. No status gate: an admin may attach
  // documents at any Request Status.
  @Post('users/:userId/files')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'requestFile', maxCount: 1 },
        { name: 'govCard', maxCount: 1 },
        { name: 'experienceForm', maxCount: 1 },
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
    },
    @Param('userId', ParseIntPipe) userId: number,
    @Req() request: RequestwithAdminData,
  ) {
    const toDto = (file?: Express.Multer.File[]) =>
      file?.[0] &&
      this.filesService.createFileDtoMapper(
        file[0].filename,
        file[0].path,
        userId,
        request.user.id,
      );

    return await this.filesService.uploadStepThree('admin', userId, {
      govcard: toDto(files?.govCard),
      reqFile: toDto(files?.requestFile),
      expfile: toDto(files?.experienceForm),
    });
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
