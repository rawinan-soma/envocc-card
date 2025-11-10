import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SealsService } from './seals.service';
import { AdminsService } from 'src/admins/admins.service';
import { FilesService } from 'src/files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';

@UseGuards(JwtAccessGuardAdmin)
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
    // @Body() seal_name: string,
  ) {
    const sealDto = this.filesService.createFileDtoMapper(
      seal.filename,
      seal.path,
      undefined,
      request.user.id,
    );

    const admin = await this.adminsService.getAdminById(request.user.id);

    return await this.sealsService.createAndUpdateSealTx(
      sealDto,
      admin.organizationId,
      // seal_name,
    );
  }

  // TODO: GET PATCH
  @Get('seals')
  async getSealByIdHandler(@Query() sealId: number) {
    return await this.sealsService.getSealsById(sealId);
  }
}
