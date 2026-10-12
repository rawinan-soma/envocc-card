import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { JwtAccessStrategy as AdminJwtAccessStrategy } from 'src/admin-auth/jwt-access.strategy';
import { AdminFileController } from 'src/files/admin-file.controller';
import { FilesService } from 'src/files/files.service';
import { startApp, testConfig } from './support/test-app';

const ACCESS_SECRET = 'test-access-secret';
const ADMIN_ID = 3;

const routes = [
  { method: 'get', path: '/admins/users/7/files/envcard' },
  { method: 'delete', path: '/admins/users/7/files/envcard' },
] as const;

describe('admin file routes', () => {
  let app: INestApplication<App>;
  let token: string;
  let prisma: {
    admins: { findUnique: jest.Mock };
    envocc_card_files: { findFirst: jest.Mock; delete: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      admins: {
        findUnique: jest.fn().mockResolvedValue({
          id: ADMIN_ID,
          username: 'admin',
          role: 'admin',
          organization: { level: 'MINISTRY' },
        }),
      },
      // No stored file, so an authenticated call ends in 404 inside
      // FilesService and never touches the disk.
      envocc_card_files: {
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminFileController],
      providers: [
        AdminJwtAccessStrategy,
        FilesService,
        { provide: PrismaService, useValue: prisma },
        testConfig({ ACCESS_TOKEN_SECRET: ACCESS_SECRET }),
      ],
    }).compile();

    app = await startApp(moduleRef);

    token = new JwtService().sign(
      { id: ADMIN_ID },
      { secret: ACCESS_SECRET, expiresIn: '60s' },
    );
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it.each(routes)('gets 401 without a cookie on $method $path', async (r) => {
    await request(app.getHttpServer())[r.method](r.path).expect(401);
    expect(prisma.envocc_card_files.findFirst).not.toHaveBeenCalled();
    expect(prisma.envocc_card_files.delete).not.toHaveBeenCalled();
  });

  it.each(routes)(
    'gets 401 with only a user cookie on $method $path',
    async (r) => {
      await request(app.getHttpServer())
        [r.method](r.path)
        .set('Cookie', `Authentication_User=${token}`)
        .expect(401);
      expect(prisma.envocc_card_files.findFirst).not.toHaveBeenCalled();
    },
  );

  it.each(routes)(
    'reaches FilesService with an admin cookie on $method $path',
    async (r) => {
      await request(app.getHttpServer())
        [r.method](r.path)
        .set('Cookie', `Authentication_Admin=${token}`)
        .expect(404);
      expect(prisma.envocc_card_files.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7 } }),
      );
    },
  );
});
