import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminsModule } from './admins/admins.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { CommonDocumentsModule } from './common-documents/common-documents.module';
import { FilesModule } from './files/files.module';
import { MembersModule } from './members/members.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PositionsModule } from './positions/positions.module';
import { RequestModule } from './request/request.module';
import { SealsModule } from './seals/seals.module';
import { SignaturesModule } from './signatures/signatures.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from './queue/queue.module';

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
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
      }),
    }),
    PrismaModule,
    AdminsModule,
    AdminAuthModule,
    UserAuthModule,
    UsersModule,
    CommonDocumentsModule,
    FilesModule,
    MembersModule,
    OrganizationsModule,
    PositionsModule,
    RequestModule,
    SealsModule,
    SignaturesModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'assets'),
      serveRoot: '/app/assets',
    }),
    BullModule.forRoot({
      connection: { host: 'redis', port: 6379 },
    }),
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
