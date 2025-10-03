import {
  Controller,
  Req,
  UseGuards,
  Get,
  Patch,
  Body,
  UploadedFiles,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateDto } from './dto/user-update.dto';
import { FileCreateDto } from 'src/files/dto/file-create.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';

@UseGuards(JwtAccessGuardUser)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getCurrentUserHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserById(Number(request.user.id));
  }

  @Patch('me')
  async updateUserHandler(
    @Req() request: RequestwithUserData,
    @Body() user: UserUpdateDto,
  ) {
    return this.usersService.updateUser(request.user.id, user);
  }

  @Get('me/requests/form')
  async createRequestFormHandler(@Req() request: RequestwithUserData) {
    const id = request.user.id;
    return this.usersService.getUserRequestForm(id);
  }

  @Get('me/requests/exp')
  async createExpFormHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserPrintExpForm(request.user.id);
  }

  // @Post('me/govcard')
  // @UseInterceptors(
  //   FileInterceptor('govcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  // )
  // async createGovcardHandler(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Req() request: RequestwithUserData,
  // ) {
  //   const dto = this.createFileDtoMapper(
  //     request.user.id,
  //     file.filename,
  //     file.path,
  //   );
  //   const govcard = await this.filesService.createFile('govcard', dto);
  //   return { msg: 'govcard create', id: govcard?.id };
  // }

  // @Post('me/expfile')
  // @UseInterceptors(
  //   FileInterceptor('expfile', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  // )
  // async createExpHandler(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Req() request: RequestwithUserData,
  // ) {
  //   const dto = this.createFileDtoMapper(
  //     request.user.id,
  //     file.filename,
  //     file.path,
  //   );
  //   const expfile = await this.filesService.createFile('expfile', dto);
  //   return { msg: 'expfile create', id: expfile?.id };
  // }

  // @Post('me/photo')
  // @UseInterceptors(
  //   FileInterceptor('photo', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  // )
  // async createPhotosHandler(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Req() request: RequestwithUserData,
  // ) {
  //   const dto = this.createFileDtoMapper(
  //     request.user.id,
  //     file.filename,
  //     file.path,
  //   );
  //   const photo = await this.filesService.createFile('photo', dto);
  //   return { msg: 'photo create', id: photo?.id };
  // }

  private createFileDtoMapper(user: number, filename: string, url: string) {
    const dto = new FileCreateDto();
    dto.userId = user;
    dto.file_name = filename;
    dto.url = url;

    return dto;
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
}
