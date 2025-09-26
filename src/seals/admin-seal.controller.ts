import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { SealsService } from './seals.service';
import { AdminsService } from 'src/admins/admins.service';
import { FilesService } from 'src/files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';

@Controller('admins')
export class AdminSealController {
  constructor(
    private readonly sealsService: SealsService,
    private readonly adminsService: AdminsService,
    private readonly filesService: FilesService,
  ) {}

  @Post('seals')
  @UseInterceptors(
    FileInterceptor('seal', getMulterOptions(['.png'], 10 * 1024 * 1024)),
  )
  async createSealHandler(
    @UploadedFile() seal: Express.Multer.File,
    @Req() request: RequestwithAdminData,
    @Body() seal_name: string,
  ) {
    const sealDto = this.filesService.createFileDtoMapper(
      request.user.id,
      seal.filename,
      seal.path,
    );

    const admin = await this.adminsService.getAdminById(request.user.id);

    return await this.sealsService.createAndUpdateSealTx(
      sealDto,
      admin.adminOnOrg[0].organization.id,
      seal_name,
    );
  }
}
