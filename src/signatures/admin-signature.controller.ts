import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import type { RequestwithAdminData } from 'src/admin-auth/request-admin.interface';
import { SignatureCreateDto } from './dto/signature-create.dto';
import { AdminsService } from 'src/admins/admins.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminSignatureController {
  constructor(
    private readonly signatureService: SignaturesService,
    private readonly adminsService: AdminsService,
  ) {}

  @Post('signatures')
  @UseInterceptors(
    FileInterceptor('signature', getMulterOptions(['.png'], 10 * 1024 * 1024)),
  )
  async createSignatureHandler(
    @UploadedFile() signature: Express.Multer.File,
    @Req() request: RequestwithAdminData,
    @Body() dto: SignatureCreateDto,
  ) {
    dto.filename = signature.filename;
    dto.url = signature.path;
    dto.admin = request.user.id;
    const admin = await this.adminsService.getAdminById(request.user.id);
    return await this.signatureService.createAndUpdateSignature(
      admin.organizationId,
      dto,
    );
  }
}
