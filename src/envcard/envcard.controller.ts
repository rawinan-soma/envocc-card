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
import { EnvcardService } from './envcard.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from 'src/files/files.service';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { EnvCardCreateDto } from './dto/env-card-create.dto';

@Controller('envcard')
export class EnvcardController {
  constructor(private readonly envcardService: EnvcardService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'envcard',
      new FilesService().getMulterOpitions({
        extension: ['.pdf'],
        size: 10 * 1024 * 1024,
      }),
    ),
  )
  async createEnvCardHandler(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = new EnvCardCreateDto();
    dto.user = request.user.id;
    dto.file_card_name = file.filename;
    dto.url = file.path;

    const envcard = await this.envcardService.create({ ...dto });
    return { msg: 'envcard create', id: envcard.envocc_card_file_id };
  }

  @Get(':userId')
  async getEnvCardByIdHandler(@Param('userId', ParseIntPipe) userId: number) {
    return this.envcardService.getByUserId(userId);
  }

  @Delete(':userId')
  async deleteEnvCardById(@Param('id', ParseIntPipe) userId: number) {
    return await this.envcardService.deleteByUserId(userId);
  }
}
