import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { PrismaService } from 'prisma/prisma.service';
import { ExperiencesService } from 'src/experiences/experiences.service';
import { FilesService } from 'src/files/files.service';
import { UserFileController } from 'src/files/user-file.controller';
import { MembersService } from 'src/members/members.service';
import { UserMemberController } from 'src/members/user-member.controller';
import { RequestService } from 'src/request/request.service';
import { UserRequestController } from 'src/request/user-request.controller';
import { Public } from 'src/shared/public.decorator';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import { ApprovedUser } from './approved-user.guard';
import { JwtAccessStrategy } from './jwt-access.strategy';

@ApprovedUser()
@Controller('test')
class PublicUnderApprovedController {
  @Public()
  @Get('open')
  open() {
    return { ok: true };
  }
}

const ACCESS_SECRET = 'test-access-secret';
const USER_ID = 7;

type Method = 'get' | 'post' | 'patch' | 'delete';

const blockedRoutes: [Method, string][] = [
  ['post', '/users/me/card?requestType=1'],
  ['post', '/users/me/requests'],
  ['get', '/users/me/requests/latest'],
  ['get', '/users/me/requests/form'],
  ['get', '/users/me/requests/exp'],
  ['post', '/users/me/photo'],
  ['post', '/users/me/envcard'],
  ['get', '/users/me/files/photo'],
  ['patch', '/users/me/members/qrcode'],
  ['get', '/users/me/envcard/qrcode'],
];

const allowedRoutes: [Method, string][] = [
  ['get', '/users/me'],
  ['patch', '/users/me'],
  ['get', '/users/me/experiences'],
  ['post', '/users/me/experiences'],
  ['patch', '/users/me/experiences/1'],
  ['delete', '/users/me/experiences/1'],
];

describe('ApprovedUserGuard', () => {
  let app: INestApplication;
  let isValidate: boolean;
  let workDir: string;
  let cookie: string;
  let prisma: {
    users: { findUnique: jest.Mock };
    photos: { findFirst: jest.Mock; create: jest.Mock };
    envocc_card_files: { findFirst: jest.Mock; create: jest.Mock };
  };

  const resolved = () => jest.fn().mockResolvedValue({ ok: true });

  beforeEach(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'approved-guard-'));
    mkdirSync(join(workDir, 'assets'));
    jest.spyOn(process, 'cwd').mockReturnValue(workDir);

    prisma = {
      users: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: USER_ID,
            username: 'somchai',
            role: 'user',
            is_validate: isValidate,
          }),
        ),
      },
      photos: { findFirst: jest.fn(), create: jest.fn(resolved()) },
      envocc_card_files: { findFirst: jest.fn(), create: jest.fn(resolved()) },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [
        UsersController,
        UserFileController,
        UserMemberController,
        UserRequestController,
        PublicUnderApprovedController,
      ],
      providers: [
        JwtAccessStrategy,
        FilesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: new ConfigService({ ACCESS_TOKEN_SECRET: ACCESS_SECRET }),
        },
        {
          provide: UsersService,
          useValue: {
            getUserById: resolved(),
            updateUser: resolved(),
            getUserRequestForm: resolved(),
            getUserPrintExpForm: resolved(),
            createNewCardRequest: resolved(),
          },
        },
        {
          provide: ExperiencesService,
          useValue: {
            getAllExperience: resolved(),
            addExperinces: resolved(),
            editExperience: resolved(),
            deleteExperience: resolved(),
          },
        },
        {
          provide: MembersService,
          useValue: { setQrPassword: resolved(), getMember: resolved() },
        },
        {
          provide: RequestService,
          useValue: { getCurrentStatus: resolved(), updateStatus: resolved() },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    const token = new JwtService().sign(
      { id: USER_ID },
      { secret: ACCESS_SECRET, expiresIn: '60s' },
    );
    cookie = `Authentication_User=${token}`;
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    rmSync(workDir, { recursive: true, force: true });
  });

  const call = (method: Method, path: string) => {
    const req = request(app.getHttpServer())
      [method](path)
      .set('Cookie', cookie);
    return method === 'post' && path === '/users/me/experiences'
      ? req.send([])
      : req;
  };

  const uploadPhoto = () =>
    request(app.getHttpServer())
      .post('/users/me/photo')
      .set('Cookie', cookie)
      .attach('photo', Buffer.from('fake-image'), 'me.jpg');

  const uploadEnvcard = () =>
    request(app.getHttpServer())
      .post('/users/me/envcard')
      .set('Cookie', cookie)
      .attach('envcard', Buffer.from('%PDF-fake'), 'card.pdf');

  const filesOnDisk = () => readdirSync(join(workDir, 'assets'));

  describe('unapproved user', () => {
    beforeEach(() => {
      isValidate = false;
    });

    it.each(blockedRoutes)(
      'gets 403 user not validated on %s %s',
      async (method, path) => {
        const res = await call(method, path);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('user not validated');
      },
    );

    it.each(allowedRoutes)('gets 2xx on %s %s', async (method, path) => {
      const res = await call(method, path);

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });

    it('cannot upload a photo: no file on disk, no photos row', async () => {
      const res = await uploadPhoto();

      expect(res.status).toBe(403);
      expect(filesOnDisk()).toEqual([]);
      expect(prisma.photos.create).not.toHaveBeenCalled();
    });

    it('cannot upload an envcard: no file on disk, no envocc_card_files row', async () => {
      const res = await uploadEnvcard();

      expect(res.status).toBe(403);
      expect(filesOnDisk()).toEqual([]);
      expect(prisma.envocc_card_files.create).not.toHaveBeenCalled();
    });
  });

  describe('approved user', () => {
    beforeEach(() => {
      isValidate = true;
    });

    it('can upload a photo', async () => {
      const res = await uploadPhoto();

      expect(res.status).toBe(201);
      expect(filesOnDisk()).toHaveLength(1);
      expect(prisma.photos.create).toHaveBeenCalledTimes(1);
    });

    it.each(
      blockedRoutes.filter(
        ([, path]) => !path.includes('envcard') && !path.includes('photo'),
      ),
    )('is not blocked on %s %s', async (method, path) => {
      const res = await call(method, path);

      expect(res.status).not.toBe(403);
    });
  });

  it('lets the same session through once an admin approves it', async () => {
    isValidate = false;
    expect((await uploadPhoto()).status).toBe(403);

    isValidate = true;
    expect((await uploadPhoto()).status).toBe(201);
  });

  it('skips @Public() routes', async () => {
    isValidate = false;

    const res = await request(app.getHttpServer()).get('/test/open');

    expect(res.status).toBe(200);
  });
});
