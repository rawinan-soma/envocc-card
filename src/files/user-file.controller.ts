import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  // UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileModelMap, FilesService } from './files.service';
import { FileCreateDto } from './dto/file-create.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';

@UseGuards(JwtAccessGuardUser)
@Controller('users')
export class UserFileController {
  constructor(private readonly filesService: FilesService) {}

  private createFileDtoMapper(user: number, filename: string, url: string) {
    const dto = new FileCreateDto();
    dto.userId = user;
    dto.file_name = filename;
    dto.url = url;

    return dto;
  }

  @Post('me/envcard')
  @UseInterceptors(
    FileInterceptor('envcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createEnvCardHandler(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = this.createFileDtoMapper(
      request.user.id,
      file.filename,
      file.path,
    );

    const envcard = await this.filesService.createFile('envcard', dto);
    return { msg: 'envcard create', id: envcard?.id };
  }

  @Post('me/photo')
  @UseInterceptors(
    FileInterceptor(
      'photo',
      getMulterOptions(['.jpg', '.png'], 10 * 1024 * 1024),
    ),
  )
  async createPhotosHandler(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = this.createFileDtoMapper(
      request.user.id,
      file.filename,
      file.path,
    );
    const photo = await this.filesService.createFile('photo', dto);
    return { msg: 'photo create', id: photo?.id };
  }

  @Get('me/files/:file')
  async getUsersFilesHandler(
    @Param('file') file: keyof FileModelMap,
    @Req() request: RequestwithUserData,
  ) {
    return await this.filesService.getFileByUserId(file, request.user.id);
  }
}
