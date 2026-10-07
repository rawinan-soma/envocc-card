import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  // UseGuards,
} from '@nestjs/common';
import { FileModelMap, FilesService } from './files.service';
// import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';
import { MophAdmin } from 'src/admin-auth/moph-admin.decorator';
// import { FileCreateDto } from './dto/file-create.dto'

// @UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminFileController {
  constructor(private readonly filesService: FilesService) {}

  @MophAdmin()
  @Get('files/envcard')
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
