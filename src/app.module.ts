import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminsModule } from './admins/admins.module';
import { PrismaModule } from 'prisma/prisma.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserAuthModule } from './user-auth/user-auth.module';
import { UsersModule } from './users/users.module';
import { RequestModule } from './request/request.module';
import Joi from '@hapi/joi';

@Module({
  imports: [
    ConfigModule.forRoot({
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
    AdminsModule,
    PrismaModule,
    AdminAuthModule,
    UserAuthModule,
    UsersModule,
    RequestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
