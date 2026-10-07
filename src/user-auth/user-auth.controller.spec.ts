import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { CommonAuthService } from 'src/shared/common-auth.service';
import { UserAuthController } from './user-auth.controller';
import { UserAuthService } from './user-auth.service';
import { UserLocalStrategy } from './user-local.strategy';

describe('POST /users/auth/login', () => {
  const password = 'correct-password';
  let app: INestApplication;

  beforeAll(async () => {
    const storedUser = {
      id: 7,
      username: 'somchai',
      password: await bcrypt.hash(password, 4),
      role: 'user',
      position: { position_id: 201, orgId: null },
      organization: { id: 1, level: 'province' },
      is_validate: false,
    };

    const prisma = {
      users: {
        findFirst: jest.fn(({ where }: { where: { username: string } }) =>
          Promise.resolve(
            where.username === storedUser.username ? { ...storedUser } : null,
          ),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [UserAuthController],
      providers: [
        UserAuthService,
        UserLocalStrategy,
        CommonAuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: {} },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            ACCESS_TOKEN_SECRET: 'access',
            REFRESH_TOKEN_SECRET: 'refresh',
            ACCESS_TOKEN_EXP: '900',
            REFRESH_TOKEN_EXP: '3600',
          }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (username: string, pass: string) =>
    request(app.getHttpServer())
      .post('/users/auth/login')
      .send({ username, password: pass });

  it('logs in an unapproved user with valid credentials and sets auth cookies', async () => {
    const res = await login('somchai', password);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ msg: 'login succesful' });
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
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
});
