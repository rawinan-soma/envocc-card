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
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateDto } from './dto/user-update.dto';
import { FileCreateDto } from 'src/files/dto/file-create.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';

// @UseGuards(JwtAccessGuardUser)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuardUser)
  @Get('me')
  async getCurrentUserHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserById(Number(request.user.id));
  }
  @UseGuards(JwtAccessGuardUser)
  @Patch('me')
  async updateUserHandler(
    @Req() request: RequestwithUserData,
    @Body() user: UserUpdateDto,
  ) {
    return this.usersService.updateUser(request.user.id, user);
  }
  @UseGuards(JwtAccessGuardUser)
  @Get('me/requests/form')
  async createRequestFormHandler(@Req() request: RequestwithUserData) {
    const id = request.user.id;
    return this.usersService.getUserRequestForm(id);
  }
  @UseGuards(JwtAccessGuardUser)
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

  private createFileDtoMapper(
    filename: string,
    url: string,
    user?: number,
    admin?: number,
  ) {
    const dto = new FileCreateDto();
    dto.userId = user ?? null;
    dto.adminId = admin ?? null;
    dto.file_name = filename;
    dto.url = url;

    return dto;
  }

  @UseGuards(JwtAccessGuardAdmin)
  @Post('me/files')
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
      requestFile: Express.Multer.File[];
      govCard: Express.Multer.File[];
      experienceForm?: Express.Multer.File[];
    },
    @Req() request: RequestwithUserData,
    @Body('user', ParseIntPipe) user: number,
  ) {
    const requestFileDto = this.createFileDtoMapper(
      files.requestFile[0].filename,
      files.requestFile[0].path,
      user,
      request.user.id,
    );
    const govcardDto = this.createFileDtoMapper(
      files.govCard[0].filename,
      files.govCard[0].path,
      user,
      request.user.id,
    );

    let experienceFormDto: FileCreateDto;
    if (files?.experienceForm) {
      experienceFormDto = this.createFileDtoMapper(
        files.experienceForm[0].filename,
        files.experienceForm[0].path,
        user,
        request.user.id,
      );

      return await this.usersService.txUploadFileandUpdateRequest(
        govcardDto,
        requestFileDto,
        user,
        experienceFormDto,
      );
    } else {
      return await this.usersService.txUploadFileandUpdateRequest(
        govcardDto,
        requestFileDto,
        user,
      );
    }
  }
}
