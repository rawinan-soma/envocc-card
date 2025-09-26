import { forwardRef, Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { AdminFileController } from './admin-file.controller';
import { UserFileController } from './user-file.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [FilesService],
  exports: [FilesService],
  controllers: [AdminFileController, UserFileController],
})
export class FilesModule {}
