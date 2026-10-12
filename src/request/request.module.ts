import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { AdminRequestController } from './admin-request.controller';
import { UserRequestController } from './user-request.controller';
import { FilesService } from 'src/files/files.service';

@Module({
  providers: [RequestService, FilesService],
  exports: [RequestService],
  controllers: [AdminRequestController, UserRequestController],
})
export class RequestModule {}
