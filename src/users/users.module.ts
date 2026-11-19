import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUserController } from './admin-user.controller';
import { UserCardRequestController } from './user-card-request.controller';
import { AdminsService } from 'src/admins/admins.service';
import { ExperiencesService } from 'src/experiences/experiences.service';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [
    UsersController,
    UserCardRequestController,
    AdminUserController,
  ],
  providers: [UsersService, AdminsService, ExperiencesService],
  exports: [UsersService],
})
export class UsersModule {}
