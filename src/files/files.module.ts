import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { AdminFileController } from './admin-file.controller';

@Module({
  providers: [FilesService],
  exports: [FilesService],
  controllers: [AdminFileController],
})
export class FilesModule {}
