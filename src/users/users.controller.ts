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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateDto } from './dto/user-update.dto';
import { RequestService } from 'src/request/request.service';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from 'src/files/files.service';
import { FileCreateDto } from 'src/files/dto/file-create.dto';

import { getMulterOptions } from 'src/common/file-multer-options';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly requestService: RequestService,
    private readonly filesService: FilesService,
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

  @Post('me/envcard')
  @UseInterceptors(
    FileInterceptor('envcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createEnvCardHandler(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = new FileCreateDto();
    dto.user = request.user.id;
    dto.file_name = file.filename;
    dto.url = file.path;

    const envcard = await this.filesService.createFile('envcard', dto);
    return { msg: 'envcard create', id: envcard?.id };
  }

  @Get('me/envcard')
  async getEnvcardHandler(@Req() request: RequestwithUserData) {
    return this.filesService.getFileByUserId('envcard', request.user.id);
  }

  // TODO: Map controller to all file

  @Post('me/govcard')
  @UseInterceptors(
    FileInterceptor('govcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createGovcardHandler() {}
}
