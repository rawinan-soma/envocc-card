import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { JwtAccessStrategy } from 'src/admin-auth/jwt-access.strategy';
import { ExperiencesService } from 'src/experiences/experiences.service';
import { FilesService } from 'src/files/files.service';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import { startApp, testConfig } from './support/test-app';

const ACCESS_SECRET = 'test-access-secret';
const ADMIN_ID = 3;
const APPLICANT_ID = 42;

describe('POST /users/me/files (admin uploads applicant documents)', () => {
  let app: INestApplication<App>;
  let workDir: string;
  let cookie: string;
  let tx: {
    request_files: { create: jest.Mock };
    gov_card_files: { create: jest.Mock };
    exp_files: { create: jest.Mock };
    requests: { create: jest.Mock };
  };

  const stubReturningOk = () => jest.fn().mockResolvedValue({ ok: true });

  beforeEach(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'admin-upload-files-'));
    mkdirSync(join(workDir, 'assets'));
    jest.spyOn(process, 'cwd').mockReturnValue(workDir);

    tx = {
      request_files: { create: stubReturningOk() },
      gov_card_files: { create: stubReturningOk() },
      exp_files: { create: stubReturningOk() },
      requests: { create: stubReturningOk() },
    };

    const prisma = {
      admins: {
        findUnique: jest.fn().mockResolvedValue({
          id: ADMIN_ID,
          username: 'admin',
          role: 'admin',
          organization: { level: 'province' },
        }),
      },
      $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        JwtAccessStrategy,
        UsersService,
        FilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ExperiencesService, useValue: {} },
        testConfig({ ACCESS_TOKEN_SECRET: ACCESS_SECRET }),
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
    jest.restoreAllMocks();
    rmSync(workDir, { recursive: true, force: true });
  });

  const upload = (fields: string[]) =>
    fields.reduce(
      (req, field) => req.attach(field, Buffer.from('%PDF'), `${field}.pdf`),
      request(app.getHttpServer())
        .post('/users/me/files')
        .set('Cookie', cookie)
        .field('user', String(APPLICANT_ID)),
    );

  // One row stored for the applicant, attributed to the uploading admin.
  const expectFileStored = (create: jest.Mock) => {
    expect(create).toHaveBeenCalledTimes(1);
    const [[row]] = create.mock.calls as [[unknown]];
    expect(row).toMatchObject({
      data: { userId: APPLICANT_ID, adminId: ADMIN_ID },
    });
  };

  it('accepts a gov card alone and opens the request without a request file', async () => {
    const res = await upload(['govCard']);

    expect(res.status).toBe(201);
    expectFileStored(tx.gov_card_files.create);
    expect(tx.request_files.create).not.toHaveBeenCalled();
    expect(tx.exp_files.create).not.toHaveBeenCalled();
    expect(tx.requests.create).toHaveBeenCalledWith({
      data: { userId: APPLICANT_ID, request_type: 1, request_status: 4 },
    });
  });

  it('stores the gov card and experience form when no request file is sent', async () => {
    const res = await upload(['govCard', 'experienceForm']);

    expect(res.status).toBe(201);
    expectFileStored(tx.gov_card_files.create);
    expectFileStored(tx.exp_files.create);
    expect(tx.request_files.create).not.toHaveBeenCalled();
    expect(tx.requests.create).toHaveBeenCalledTimes(1);
  });

  it('still stores the request file when an admin sends one', async () => {
    const res = await upload(['requestFile', 'govCard', 'experienceForm']);

    expect(res.status).toBe(201);
    expectFileStored(tx.request_files.create);
    expectFileStored(tx.gov_card_files.create);
    expectFileStored(tx.exp_files.create);
    expect(tx.requests.create).toHaveBeenCalledWith({
      data: { userId: APPLICANT_ID, request_type: 1, request_status: 4 },
    });
  });
});
