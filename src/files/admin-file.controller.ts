import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileModelMap, FilesService } from './files.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
// import { FileCreateDto } from './dto/file-create.dto'

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminFileController {
  constructor(private readonly filesService: FilesService) {}

  @Get('users/:userId/files/:file')
  async getUsersFilesHandler(
    @Param('file') file: keyof FileModelMap,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return await this.filesService.getFileByUserId(file, userId);
  }

  @Delete('users/:userId/files/:file')
  async deleteFilesHandler(
    @Param('file') file: keyof FileModelMap,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return await this.filesService.deleteFileByUserId(file, userId);
  }
}
