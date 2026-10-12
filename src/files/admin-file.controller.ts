import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileModelMap, FilesService } from './files.service';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import { MophAdminGuard } from 'src/admin-auth/ministry-admin.guard';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminFileController {
  constructor(private readonly filesService: FilesService) {}

  // Lists envcard files across every user, so only MOPH admins may call it.
  @Get('files/envcard')
  @UseGuards(MophAdminGuard)
  async listEnvcardFilesHandler(
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ) {
    return await this.filesService.listEnvcardFiles(userId);
  }

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
