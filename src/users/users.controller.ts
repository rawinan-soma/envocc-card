import {
  Controller,
  Req,
  UseGuards,
  Get,
  Patch,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  UnauthorizedException,
  UploadedFiles,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateDto } from './dto/user-update.dto';
import { RequestService } from 'src/request/request.service';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { FileModelMap, FilesService } from 'src/files/files.service';
import { FileCreateDto } from 'src/files/dto/file-create.dto';

import { getMulterOptions } from 'src/shared/file-multer-options';
import { MembersService } from 'src/members/members.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly requestService: RequestService,
    private readonly filesService: FilesService,
    private readonly membersService: MembersService,
  ) {}

  @UseGuards(JwtAccessGuardUser)
  @Get('me')
  async getCurrentUserHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserById(Number(request.user.id));
  }

  @Patch()
  async updateUserHandler(
    @Req() request: RequestwithUserData,
    @Body() user: UserUpdateDto,
  ) {
    return this.usersService.updateUser(request.user.id, user);
  }

  @Get('me/requests/latest')
  async getCurrentStatusHandler(@Req() request: RequestwithUserData) {
    return this.requestService.getCurrentStatus(request.user.id);
  }

  @Post('me/requests')
  async updateStatusHandler(
    @Req() request: RequestwithUserData,
    @Body() updated: StatusCreateDto,
  ) {
    const approver = request.user.id;
    return this.requestService.updateStatus(updated, approver);
  }

  private createFileDtoMapper(user: number, filename: string, url: string) {
    const dto = new FileCreateDto();
    dto.user = user;
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

  // TODO: Map controller to all file

  @Post('me/govcard')
  @UseInterceptors(
    FileInterceptor('govcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createGovcardHandler(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = this.createFileDtoMapper(
      request.user.id,
      file.filename,
      file.path,
    );
    const govcard = await this.filesService.createFile('govcard', dto);
    return { msg: 'govcard create', id: govcard?.id };
  }

  @Post('me/expfile')
  @UseInterceptors(
    FileInterceptor('expfile', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createExpHandler(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = this.createFileDtoMapper(
      request.user.id,
      file.filename,
      file.path,
    );
    const expfile = await this.filesService.createFile('expfile', dto);
    return { msg: 'expfile create', id: expfile?.id };
  }

  @Post('me/photo')
  @UseInterceptors(
    FileInterceptor('photo', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
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
      experienceForm: Express.Multer.File[];
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
    const experienceFormDto = this.createFileDtoMapper(
      request.user.id,
      files.experienceForm[0].filename,
      files.experienceForm[0].path,
    );
    return await this.usersService.txUploadFileandUpdateRequest(
      experienceFormDto,
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

  @Patch('me/members/qrcode')
  async setQRPasswordHandler(
    @Body('password') password: string,
    @Req() request: RequestwithUserData,
  ) {
    return this.membersService.setQrPassword(request.user.id, password);
  }
}
