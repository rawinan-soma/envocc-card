import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { users } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { CommonAuthService } from 'src/shared/common-auth.service';
import { JwtAccessStrategy } from 'src/user-auth/jwt-access.strategy';
import { JwtRefreshStrategy } from 'src/user-auth/jwt-refresh.strategy';
import { UserAuthController } from 'src/user-auth/user-auth.controller';
import { UserAuthService } from 'src/user-auth/user-auth.service';
import { UserLocalStrategy } from 'src/user-auth/user-local.strategy';
import {
  cookiePairs,
  setCookies,
  startApp,
  testConfig,
} from './support/test-app';

describe('/users/auth for an unvalidated user', () => {
  const password = 'correct-password';
  let app: INestApplication;
  let storedUser: Pick<
    users,
    | 'id'
    | 'username'
    | 'password'
    | 'role'
    | 'is_validate'
    | 'hashedRefreshToken'
  > & {
    position: { position_id: number; orgId: number | null };
    organization: { id: number; level: string };
  };

  beforeAll(async () => {
    storedUser = {
      id: 7,
      username: 'somchai',
      password: await bcrypt.hash(password, 4),
      role: 'user',
      position: { position_id: 201, orgId: null },
      organization: { id: 1, level: 'province' },
      is_validate: false,
      hashedRefreshToken: null,
    };

    const prisma = {
      users: {
        findFirst: ({ where }: { where: { username: string } }) =>
          Promise.resolve(
            where.username === storedUser.username ? { ...storedUser } : null,
          ),
        findUnique: ({ where }: { where: { id: number } }) =>
          Promise.resolve(
            where.id === storedUser.id ? { ...storedUser } : null,
          ),
        update: ({ data }: { data: { hashedRefreshToken: string | null } }) => {
          storedUser.hashedRefreshToken = data.hashedRefreshToken;
          return Promise.resolve({ ...storedUser });
        },
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [UserAuthController],
      providers: [
        UserAuthService,
        UserLocalStrategy,
        JwtAccessStrategy,
        JwtRefreshStrategy,
        CommonAuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: {} },
        testConfig({
          ACCESS_TOKEN_SECRET: 'access',
          REFRESH_TOKEN_SECRET: 'refresh',
          ACCESS_TOKEN_EXP: '900',
          REFRESH_TOKEN_EXP: '3600',
        }),
      ],
    }).compile();

    app = await startApp(moduleRef);
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (username: string, pass: string) =>
    request(app.getHttpServer())
      .post('/users/auth/login')
      .send({ username, password: pass });

  it('logs in with valid credentials and sets auth cookies', async () => {
    const res = await login('somchai', password);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ msg: 'login succesful' });
    const cookies = setCookies(res);
    expect(cookies.some((c) => c.startsWith('Authentication_User='))).toBe(
      true,
    );
    expect(cookies.some((c) => c.startsWith('Refresh_User='))).toBe(true);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await login('somchai', 'wrong-password');

    expect(res.status).toBe(401);
  });

  it('rejects an unknown username with 401', async () => {
    const res = await login('nobody', password);

    expect(res.status).toBe(401);
  });

  it('can refresh the access token', async () => {
    const cookies = cookiePairs(await login('somchai', password));

    const res = await request(app.getHttpServer())
      .post('/users/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(
      setCookies(res).some((c) => c.startsWith('Authentication_User=')),
    ).toBe(true);
  });

  it('can log out', async () => {
    const cookies = cookiePairs(await login('somchai', password));

    const res = await request(app.getHttpServer())
      .post('/users/auth/logout')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ msg: 'logout succesful' });
    expect(storedUser.hashedRefreshToken).toBeNull();
  });
});
