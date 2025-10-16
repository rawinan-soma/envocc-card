import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { AdminFileController } from './admin-file.controller';
import { UserFileController } from './user-file.controller';

@Module({
  providers: [FilesService],
  exports: [FilesService],
  controllers: [AdminFileController, UserFileController],
})
export class FilesModule {}
