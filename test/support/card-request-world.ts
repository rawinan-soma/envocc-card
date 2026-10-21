import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { JwtAccessStrategy } from 'src/admin-auth/jwt-access.strategy';
import { AdminsService } from 'src/admins/admins.service';
import { ExperiencesService } from 'src/experiences/experiences.service';
import { FilesService } from 'src/files/files.service';
import { AdminMemberController } from 'src/members/admin-member.controller';
import { CommonMembersController } from 'src/members/common-members.controller';
import { MembersService } from 'src/members/members.service';
import { AdminRequestController } from 'src/request/admin-request.controller';
import { RequestService } from 'src/request/request.service';
import { JwtAccessStrategy as UserJwtAccessStrategy } from 'src/user-auth/jwt-access.strategy';
import { AdminUserController } from 'src/users/admin-user.controller';
import { AdminFileController } from 'src/files/admin-file.controller';
import { UserFileController } from 'src/files/user-file.controller';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import { startApp, testConfig } from './test-app';
import { createTestDb, TestDb } from './test-db';
import { OrgFixture, seedOrganizations } from './org-fixtures';

const ACCESS_SECRET = 'test-access-secret';

// MINISTRY ─┬─ DEPARTMENT ── PROVINCE ── UNIT
//           └─ OTHER_DEPARTMENT
export const ORG = {
  MINISTRY: 1,
  DEPARTMENT: 2,
  PROVINCE: 3,
  UNIT: 4,
  OTHER_DEPARTMENT: 5,
} as const;

// One admin per organization, with the same id as its organization.
export const ADMIN = ORG;

export type FileKind = 'photo' | 'govcard' | 'expfile' | 'reqFile';

const fileTable = {
  photo: 'photos',
  govcard: 'gov_card_files',
  expfile: 'exp_files',
  reqFile: 'request_files',
} as const;

const seedWorld = async (prisma: PrismaClient) => {
  await prisma.request_statuses.createMany({
    data: Array.from({ length: 17 }, (_, i) => ({
      status_id: i,
      status_name: `status ${i}`,
    })),
  });
  await prisma.position_lvs.create({ data: { position_lv_id: 1 } });

  const orgs: OrgFixture[] = [
    [ORG.MINISTRY, 'MINISTRY', null],
    [ORG.DEPARTMENT, 'DEPARTMENT', ORG.MINISTRY],
    [ORG.PROVINCE, 'PROVINCE', ORG.DEPARTMENT],
    [ORG.UNIT, 'UNIT', ORG.PROVINCE],
    [ORG.OTHER_DEPARTMENT, 'DEPARTMENT', ORG.MINISTRY],
  ];
  await seedOrganizations(prisma, orgs);
  for (const [id] of orgs) {
    await prisma.admins.create({
      data: {
        id,
        username: `admin${id}`,
        password: 'x',
        pname: 'Mr',
        fname: 'Admin',
        lname: `${id}`,
        private_number: '0',
        work_number: '0',
        email: `admin${id}@example.com`,
        positionId: '1',
        positionLvId: 1,
        organizationId: id,
      },
    });
  }
};

// A running Nest app over a real database and a temp working directory
// (uploads land in <workDir>/assets), with helpers to build card requests.
export const createCardRequestWorld = async () => {
  const db: TestDb = await createTestDb();
  let app: INestApplication<App>;
  let workDir: string;
  let userCount = 0;

  const start = async () => {
    workDir = mkdtempSync(join(tmpdir(), 'card-request-'));
    mkdirSync(join(workDir, 'assets'));
    jest.spyOn(process, 'cwd').mockReturnValue(workDir);

    await db.reset();
    await seedWorld(db.prisma);
    userCount = 0;

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AdminRequestController,
        AdminUserController,
        AdminMemberController,
        CommonMembersController,
        UsersController,
        AdminFileController,
        UserFileController,
      ],
      providers: [
        JwtAccessStrategy,
        UserJwtAccessStrategy,
        RequestService,
        UsersService,
        FilesService,
        AdminsService,
        ExperiencesService,
        MembersService,
        { provide: PrismaService, useValue: db.prisma },
        { provide: getQueueToken('cleanup'), useValue: { add: jest.fn() } },
        testConfig({ ACCESS_TOKEN_SECRET: ACCESS_SECRET }),
      ],
    }).compile();

    app = await startApp(moduleRef, { validation: true });
  };

  const stop = async () => {
    await app.close();
    jest.restoreAllMocks();
    rmSync(workDir, { recursive: true, force: true });
  };

  // Admin and user sessions share ACCESS_SECRET; only the cookie name differs.
  const signedIn = (cookieName: string, id: number) => {
    const token = new JwtService().sign(
      { id },
      { secret: ACCESS_SECRET, expiresIn: '60s' },
    );
    const cookie = `${cookieName}=${token}`;
    const server = () => request(app.getHttpServer());
    return {
      get: (path: string) => server().get(path).set('Cookie', cookie),
      post: (path: string) => server().post(path).set('Cookie', cookie),
      put: (path: string) => server().put(path).set('Cookie', cookie),
      patch: (path: string) => server().patch(path).set('Cookie', cookie),
      delete: (path: string) => server().delete(path).set('Cookie', cookie),
    };
  };

  const asAdmin = (adminId: number) =>
    signedIn('Authentication_Admin', adminId);

  const asUser = (userId: number) => signedIn('Authentication_User', userId);

  const anonymous = () => request(app.getHttpServer());

  // A user whose Status History walks through `history` in order; the last
  // entry is their Request Status. Approved if any status is above 0.
  const createUser = async ({
    orgId = ORG.UNIT,
    history,
  }: {
    orgId?: number;
    history: number[];
  }) => {
    const n = ++userCount;
    const user = await db.prisma.users.create({
      data: {
        cid: `cid-${n}`,
        username: `user${n}`,
        password: 'x',
        pname_th: 'นาย',
        pname_other_th: '',
        fname_th: `ชื่อ${n}`,
        lname_th: 'สกุล',
        pname_en: 'Mr',
        pname_other_en: '',
        fname_en: `Name${n}`,
        lname_en: 'Surname',
        birthday: new Date('1990-01-01'),
        nationality: 'ไทย',
        blood: 'O',
        work_number: '0',
        private_number: '0',
        email: `user${n}@example.com`,
        house_number1: '1',
        province1: 1,
        amphures1: 1,
        district1: 1,
        zip_code1: 10000,
        house_number2: '1',
        province2: 1,
        amphures2: 1,
        district2: 1,
        zip_code2: 10000,
        is_validate: history.some((s) => s > 0),
        organizationId: orgId,
      },
    });

    // Explicit, increasing timestamps in the past so "latest" is unambiguous.
    const start = Date.parse('2026-01-01T00:00:00Z');
    for (const [i, status] of history.entries()) {
      await db.prisma.requests.create({
        data: {
          userId: user.id,
          request_status: status,
          request_type: 1,
          date_update: new Date(start + i * 60_000),
        },
      });
    }

    return user.id;
  };

  // A file of `kind` stored for the user, on disk and as a row.
  const giveFile = async (userId: number, kind: FileKind) => {
    const filename = `${kind}-${userId}-${Math.random().toString(36).slice(2)}.pdf`;
    const url = join(workDir, 'assets', filename);
    writeFileSync(url, 'fake');
    const data = { userId, filename, url };
    const withAdmin = { ...data, adminId: ADMIN.UNIT };
    switch (kind) {
      case 'photo':
        await db.prisma.photos.create({ data });
        break;
      case 'govcard':
        await db.prisma.gov_card_files.create({ data: withAdmin });
        break;
      case 'expfile':
        await db.prisma.exp_files.create({ data: withAdmin });
        break;
      case 'reqFile':
        await db.prisma.request_files.create({ data: withAdmin });
        break;
    }
    return url;
  };

  const filesOf = async (userId: number, kind: FileKind) =>
    db.prisma.$queryRawUnsafe<{ url: string }[]>(
      `SELECT url FROM "${fileTable[kind]}" WHERE "userId" = $1`,
      userId,
    );

  const giveMember = async (
    userId: number,
    data: {
      member_no: number;
      qrcode: string;
      is_active?: boolean;
      start_date?: Date;
      end_date?: Date;
    },
  ) =>
    db.prisma.members.create({
      data: {
        userId,
        qrcode_pass: 'secret',
        start_date: new Date('2026-02-01'),
        end_date: new Date('2031-01-31'),
        ...data,
      },
    });

  const historyOf = async (userId: number) =>
    (
      await db.prisma.requests.findMany({
        where: { userId },
        orderBy: [{ date_update: 'asc' }, { id: 'asc' }],
      })
    ).map((r) => r.request_status);

  return {
    prisma: db.prisma,
    start,
    stop,
    drop: db.drop,
    asAdmin,
    asUser,
    anonymous,
    createUser,
    giveFile,
    filesOf,
    giveMember,
    historyOf,
    workDir: () => workDir,
  };
};

export type CardRequestWorld = Awaited<
  ReturnType<typeof createCardRequestWorld>
>;
