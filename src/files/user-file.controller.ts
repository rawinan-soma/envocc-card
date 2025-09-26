import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileModelMap, FilesService } from './files.service';
import { FileCreateDto } from './dto/file-create.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UsersService } from 'src/users/users.service';

@Controller('users')
export class UserFileController {
  constructor(
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
  ) {}

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

  @Post('me/files')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'requestFile', maxCount: 1 },
        { name: 'govcard', maxCount: 1 },
        { name: 'experienceForm', maxCount: 1 },
      ],
      getMulterOptions(['.pdf'], 10 * 1024 * 1024),
    ),
  )
  async uploadFilesHandler(
    @UploadedFiles()
    files: {
      requestFile: Express.Multer.File[];
      govcard: Express.Multer.File[];
      experienceForm?: Express.Multer.File[];
    },
    @Req() request: RequestwithUserData,
  ) {
    const requestFileDto = this.createFileDtoMapper(
      request.user.id,
      files.requestFile[0].filename,
      files.requestFile[0].path,
    );
    const govcardDto = this.createFileDtoMapper(
      request.user.id,
      files.govcard[0].filename,
      files.govcard[0].path,
    );

    let experienceFormDto: FileCreateDto;
    if (files.experienceForm?.[0]) {
      experienceFormDto = this.createFileDtoMapper(
        request.user.id,
        files.experienceForm[0].filename,
        files.experienceForm[0].path,
      );

      return await this.usersService.txUploadFileandUpdateRequest(
        govcardDto,
        requestFileDto,
        request.user.id,
        experienceFormDto,
      );
    }
    return await this.usersService.txUploadFileandUpdateRequest(
      govcardDto,
      requestFileDto,
      request.user.id,
    );
  }

  @Get('me/files/:file')
  async getUsersFilesHandler(
    @Param('file') file: keyof FileModelMap,
    @Req() request: RequestwithUserData,
  ) {
    if (file === 'seal') {
      throw new UnauthorizedException('cannot getting seals');
    }
    return await this.filesService.getFileByUserId(file, request.user.id);
  }
}
