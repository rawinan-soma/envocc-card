import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { OrgLevel } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { JwtAccessStrategy as AdminJwtAccessStrategy } from 'src/admin-auth/jwt-access.strategy';
import { MOPH_ORG_CODE } from 'src/admin-auth/moph-admin.guard';
import { AdminFileController } from 'src/files/admin-file.controller';
import { FilesService } from 'src/files/files.service';
import { startApp, testConfig } from './support/test-app';

const ACCESS_SECRET = 'test-access-secret';
const ADMIN_ID = 3;
const ROUTE = '/admins/files/envcard';

const files = [
  {
    id: 2,
    userId: 8,
    filename: 'b.pdf',
    url: 'uploads/b.pdf',
    create_date: '2026-10-02T00:00:00.000Z',
  },
  {
    id: 1,
    userId: 7,
    filename: 'a.pdf',
    url: 'uploads/a.pdf',
    create_date: '2026-10-01T00:00:00.000Z',
  },
];

describe('GET /admins/files/envcard', () => {
  let app: INestApplication<App>;
  let token: string;
  let prisma: {
    admins: { findUnique: jest.Mock };
    envocc_card_files: { findMany: jest.Mock };
  };

  const asAdminOf = (level: OrgLevel, code: string) =>
    prisma.admins.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      username: 'admin',
      role: 'admin',
      organization: { level, code },
    });

  const get = (path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set('Cookie', `Authentication_Admin=${token}`);

  beforeEach(async () => {
    prisma = {
      admins: { findUnique: jest.fn() },
      envocc_card_files: { findMany: jest.fn().mockResolvedValue(files) },
    };
    asAdminOf('MINISTRY', MOPH_ORG_CODE);

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
  });

  it('gets 401 without an admin cookie', async () => {
    await request(app.getHttpServer()).get(ROUTE).expect(401);
    expect(prisma.envocc_card_files.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['another ministry', 'MINISTRY', '08000'],
    ['a department under MOPH', 'DEPARTMENT', '15001'],
    ['a province', 'PROVINCE', '15100'],
    ['a unit', 'UNIT', '15999'],
  ] as const)('gets 403 as an admin of %s', async (_, level, code) => {
    asAdminOf(level, code);

    const res = await get(ROUTE).expect(403);

    expect(res.body).toMatchObject({ message: 'admin is not from MOPH' });
    expect(prisma.envocc_card_files.findMany).not.toHaveBeenCalled();
  });

  it('lists every user’s files newest first for a MOPH admin', async () => {
    const res = await get(ROUTE).expect(200);

    expect(res.body).toEqual(files);
    expect(prisma.envocc_card_files.findMany).toHaveBeenCalledWith({
      where: { userId: undefined },
      orderBy: { create_date: 'desc' },
      select: {
        id: true,
        userId: true,
        filename: true,
        url: true,
        create_date: true,
      },
    });
  });

  it('narrows the list to one user with ?userId', async () => {
    prisma.envocc_card_files.findMany.mockResolvedValue([files[1]]);

    const res = await get(`${ROUTE}?userId=7`).expect(200);

    expect(res.body).toEqual([files[1]]);
    expect(prisma.envocc_card_files.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7 } }),
    );
  });

  it('returns an empty list for a user with no files', async () => {
    prisma.envocc_card_files.findMany.mockResolvedValue([]);

    const res = await get(`${ROUTE}?userId=999`).expect(200);

    expect(res.body).toEqual([]);
  });

  it('gets 400 for a non-integer userId', async () => {
    await get(`${ROUTE}?userId=abc`).expect(400);
    expect(prisma.envocc_card_files.findMany).not.toHaveBeenCalled();
  });
});
