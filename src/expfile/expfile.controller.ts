import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from 'src/files/files.service';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { ExpFileService } from './expfile.service';
import { ExpFileCreateDto } from './dto/exp-file-create.dto';

@Controller('envcard')
export class ExpfileController {
  constructor(private readonly expfileService: ExpFileService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'expFile',
      new FilesService().getMulterOpitions({
        extension: ['.pdf'],
        size: 10 * 1024 * 1024,
      }),
    ),
  )
  async createExpFileHandler(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = new ExpFileCreateDto();
    dto.user = request.user.id;
    dto.file_name = file.filename;
    dto.url = file.path;

    const expFile = await this.expfileService.create({ ...dto });
    return { msg: 'expFile create', id: expFile.exp_file_id };
  }

  @Get(':userId')
  async getExpFileByIdHandler(@Param('userId', ParseIntPipe) userId: number) {
    return await this.expfileService.getByUserId(userId);
  }

  @Delete(':userId')
  async deleteExpFileById(@Param('id', ParseIntPipe) userId: number) {
    return await this.expfileService.deleteByUserId(userId);
  }
}
