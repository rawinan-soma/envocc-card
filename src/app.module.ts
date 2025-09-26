import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminsModule } from './admins/admins.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserAuthModule } from './user-auth/user-auth.module';
import { UsersModule } from './users/users.module';
// import { RequestModule } from './request/request.module';
// import { FilesModule } from 'src/files/files.module';
// import { CommonDocumentsModule } from './common-documents/common-documents.module';
// import { MembersModule } from './members/members.module';
// import { SignaturesModule } from './signatures/signatures.module';
// import { ExperiecesModule } from './experiences/experiences.module';
// import { OrganizationsModule } from './organizations/organizations.module';
// import { PositionsModule } from './positions/positions.module';
// import { SealsModule } from './seals/seals.module';
import Joi from '@hapi/joi';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        SERVER_PORT: Joi.number(),
        SERVER_URL: Joi.string().required(),
        ENDPOINT_PREFIX: Joi.string().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        ACCESS_TOKEN_EXP: Joi.number().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_EXP: Joi.number().required(),
      }),
    }),
    PrismaModule,
    AdminsModule,
    AdminAuthModule,
    UserAuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
