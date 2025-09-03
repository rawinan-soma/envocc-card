import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { PublicService } from './public.service';
import { FileModelMap, FilesService } from 'src/files/files.service';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';

@Controller('shared')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly filesService: FilesService,
  ) {}

  @Get('files/:file')
  async getFilesHandler(
    @Param() file: keyof FileModelMap,
    @Query('id') id?: number,
    @Req() adminReq?: RequestwithAdminData,
    @Req() userReq?: RequestwithUserData,
  ) {
    // let id: number;
    if (!id && userReq && !adminReq) {
      id = userReq.user.id;
    }

    return await this.filesService.getFileByUserId(file, id as number);
  }
}
