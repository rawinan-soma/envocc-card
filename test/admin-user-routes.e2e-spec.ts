import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { JwtAccessStrategy } from 'src/admin-auth/jwt-access.strategy';
import { AdminsService } from 'src/admins/admins.service';
import { FilesService } from 'src/files/files.service';
import { AdminUserController } from 'src/users/admin-user.controller';
import { UsersService } from 'src/users/users.service';
import { startApp, testConfig } from './support/test-app';

const ACCESS_SECRET = 'test-access-secret';
const ADMIN_ID = 3;
const ADMIN_ORG_ID = 100;

const org = (id: number, name_th: string) => ({
  id,
  level: 'UNIT',
  name_th,
  parent: {
    id: 1,
    level: 'MINISTRY',
    name_th: 'กระทรวงสาธารณสุข',
    parent: null,
  },
});

// Shaped like the projection UsersService selects from prisma.users.
const userRow = (id: number, statuses: number[], orgId = ADMIN_ORG_ID) => ({
  id,
  pname_th: 'นาย',
  pname_other_th: null,
  fname_th: `ชื่อ${id}`,
  lname_th: `สกุล${id}`,
  organization: org(orgId, `หน่วย${orgId}`),
  members: [],
  requests: statuses.map((request_status) => ({ request_status })),
  position: { position_name: 'นักวิชาการ' },
  position_lv: { position_lv_name: 'ปฏิบัติการ' },
});

describe('admin user listing routes', () => {
  let app: INestApplication<App>;
  let cookie: string;
  let prisma: {
    admins: { findUnique: jest.Mock };
    organizations: { findUnique: jest.Mock };
    users: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      admins: {
        findUnique: jest.fn().mockResolvedValue({
          id: ADMIN_ID,
          username: 'admin',
          role: 'admin',
          organization: { level: 'UNIT' },
        }),
      },
      organizations: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: ADMIN_ORG_ID, children: [] }),
      },
      users: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [
        JwtAccessStrategy,
        UsersService,
        { provide: FilesService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        {
          provide: AdminsService,
          useValue: {
            getAdminById: jest.fn().mockResolvedValue({
              id: ADMIN_ID,
              organization: { id: ADMIN_ORG_ID },
            }),
          },
        },
        testConfig({ ACCESS_TOKEN_SECRET: ACCESS_SECRET }),
        // Mirrors the global pipe main.ts sets up for the real app.
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({ transform: true, whitelist: true }),
        },
      ],
    }).compile();

    app = await startApp(moduleRef);

    const token = new JwtService().sign(
      { id: ADMIN_ID },
      { secret: ACCESS_SECRET, expiresIn: '60s' },
    );
    cookie = `Authentication_Admin=${token}`;
  });

  afterEach(async () => {
    await app.close();
  });

  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', cookie);

  const whereOfLastFindMany = (): Record<string, unknown> =>
    (
      prisma.users.findMany.mock.lastCall as [
        { where: Record<string, unknown> },
      ]
    )[0].where;

  describe('GET /admins/users/all', () => {
    it('rejects requests without an admin token', async () => {
      const res = await request(app.getHttpServer()).get('/admins/users/all');

      expect(res.status).toBe(401);
    });

    it('returns users at every status across every organization', async () => {
      prisma.users.findMany.mockResolvedValue([
        userRow(1, [0], 201),
        userRow(2, [15], 202),
        userRow(3, [16], 203),
      ]);

      const res = await get('/admins/users/all');

      expect(res.status).toBe(200);
      expect(
        (res.body as { data: { id: number; request_status: number }[] }).data,
      ).toEqual([
        expect.objectContaining({ id: 1, request_status: 0, unit: 'หน่วย201' }),
        expect.objectContaining({ id: 2, request_status: 15 }),
        expect.objectContaining({ id: 3, request_status: 16 }),
      ]);
      expect(res.body).toMatchObject({
        pageData: { totalItems: 3, totalPages: 1, currentPage: 1, limit: 10 },
      });

      const where = whereOfLastFindMany();
      expect(where).not.toHaveProperty('requests');
      expect(where).not.toHaveProperty('organizationId');
    });

    it('returns request_status null for a user with no requests', async () => {
      prisma.users.findMany.mockResolvedValue([userRow(1, [])]);

      const res = await get('/admins/users/all');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: [{ id: 1, request_status: null }],
      });
    });

    it('pages 10 at a time and counts every user', async () => {
      prisma.users.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => userRow(i + 1, [i])),
      );

      const res = await get('/admins/users/all?page=2');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: [{ id: 11 }, { id: 12 }],
        pageData: { totalItems: 12, totalPages: 2, currentPage: 2, limit: 10 },
      });
    });

    it('passes search_term into the query', async () => {
      await get('/admins/users/all?search_term=สมชาย');

      expect(whereOfLastFindMany()).toEqual({
        OR: [
          { fname_th: { contains: 'สมชาย' } },
          { lname_th: { contains: 'สมชาย' } },
          { organization: { name_th: { contains: 'สมชาย' } } },
        ],
      });
    });

    it('rejects page below 1', async () => {
      const res = await get('/admins/users/all?page=0');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /admins/users', () => {
    it('still requires status', async () => {
      const res = await get('/admins/users');

      expect(res.status).toBe(400);
    });

    it('still filters by status and the admin org tree', async () => {
      prisma.users.findMany.mockResolvedValue([
        userRow(1, [15]),
        userRow(2, [14, 15]),
      ]);

      const res = await get('/admins/users?status=activated');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: [{ id: 1, request_status: 15 }],
        pageData: { totalItems: 1, totalPages: 1, currentPage: 1, limit: 10 },
      });
      expect(whereOfLastFindMany()).toMatchObject({
        requests: { some: { request_status: { in: [15] } } },
        organizationId: { in: [ADMIN_ORG_ID] },
      });
    });
  });
});
