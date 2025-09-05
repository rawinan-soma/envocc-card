import { Module } from '@nestjs/common';
import { ReqFilesService } from './req-files.service';
import { ReqFilesController } from './req-files.controller';

@Module({
  controllers: [ReqFilesController],
  providers: [ReqFilesService],
})
export class ReqFilesModule {}
