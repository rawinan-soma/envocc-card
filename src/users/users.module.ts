import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUserController } from './admin-user.controller';
import { FilesModule } from 'src/files/files.module';
import { AdminsModule } from 'src/admins/admins.module';

@Module({
  imports: [forwardRef(() => FilesModule), AdminsModule],
  controllers: [UsersController, AdminUserController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
