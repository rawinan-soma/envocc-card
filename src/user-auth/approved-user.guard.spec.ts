import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, readdirSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { PrismaService } from 'prisma/prisma.service';
import { FilesService } from 'src/files/files.service';
import { UserFileController } from 'src/files/user-file.controller';
import { JwtAccessGuardUser } from './jwt-access.guard';

describe('ApprovedUserGuard (via /users/me/* routes)', () => {
  let app: INestApplication;
  let isValidate: boolean;
  let workDir: string;
  const filesService = {
    createFile: jest.fn().mockResolvedValue({ id: 1 }),
    getFileByUserId: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'approved-guard-'));
    mkdirSync(join(workDir, 'assets'));
    jest.spyOn(process, 'cwd').mockReturnValue(workDir);
    filesService.createFile.mockClear();

    const prisma = {
      users: {
        findUnique: jest.fn(() => Promise.resolve({ is_validate: isValidate })),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UserFileController],
      providers: [
        { provide: FilesService, useValue: filesService },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAccessGuardUser)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = { id: 7, role: 'user' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('rejects an unapproved user with 403 and writes no file', async () => {
    isValidate = false;

    const res = await request(app.getHttpServer())
      .post('/users/me/photo')
      .attach('photo', Buffer.from('fake-image'), 'me.jpg');

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('user not validated');
    expect(readdirSync(join(workDir, 'assets'))).toEqual([]);
    expect(filesService.createFile).not.toHaveBeenCalled();
  });

  it('lets an approved user upload', async () => {
    isValidate = true;

    const res = await request(app.getHttpServer())
      .post('/users/me/photo')
      .attach('photo', Buffer.from('fake-image'), 'me.jpg');

    expect(res.status).toBe(201);
    expect(readdirSync(join(workDir, 'assets'))).toHaveLength(1);
    expect(filesService.createFile).toHaveBeenCalledTimes(1);
  });
});
