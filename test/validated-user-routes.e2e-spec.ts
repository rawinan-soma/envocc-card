import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
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
import { UserCardRequestController } from 'src/users/user-card-request.controller';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import { JwtAccessStrategy } from 'src/user-auth/jwt-access.strategy';
import { startApp, testConfig } from './support/test-app';

const ACCESS_SECRET = 'test-access-secret';
const USER_ID = 7;

type Route = {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  body?: object;
  upload?: { field: string; filename: string };
};

const photoUpload = { field: 'photo', filename: 'me.jpg' };
const envcardUpload = { field: 'envcard', filename: 'card.pdf' };

// Blocked for unvalidated users. validatedStatus is what a validated user gets
// from the same call with these stubs.
const blockedRoutes: (Route & { validatedStatus: number })[] = [
  {
    method: 'post',
    path: '/users/me/card?requestType=1',
    validatedStatus: 201,
  },
  { method: 'post', path: '/users/me/requests', validatedStatus: 201 },
  { method: 'get', path: '/users/me/requests/latest', validatedStatus: 200 },
  { method: 'get', path: '/users/me/requests/form', validatedStatus: 200 },
  { method: 'get', path: '/users/me/requests/exp', validatedStatus: 200 },
  {
    method: 'post',
    path: '/users/me/photo',
    upload: photoUpload,
    validatedStatus: 201,
  },
  {
    method: 'post',
    path: '/users/me/envcard',
    upload: envcardUpload,
    validatedStatus: 201,
  },
  // 404: reaches FilesService, which finds no stored photo for this user.
  { method: 'get', path: '/users/me/files/photo', validatedStatus: 404 },
  { method: 'patch', path: '/users/me/members/qrcode', validatedStatus: 200 },
  { method: 'get', path: '/users/me/envcard/qrcode', validatedStatus: 200 },
];

const allowedRoutes: Route[] = [
  { method: 'get', path: '/users/me' },
  { method: 'patch', path: '/users/me' },
  { method: 'get', path: '/users/me/experiences' },
  { method: 'post', path: '/users/me/experiences', body: [] },
  { method: 'patch', path: '/users/me/experiences/1' },
  { method: 'delete', path: '/users/me/experiences/1' },
];

describe('@ValidatedUser() routes', () => {
  let app: INestApplication;
  let isValidate: boolean;
  let workDir: string;
  let cookie: string;
  let prisma: {
    users: { findUnique: jest.Mock };
    photos: { findFirst: jest.Mock; create: jest.Mock };
    envocc_card_files: { findFirst: jest.Mock; create: jest.Mock };
  };

  const stubReturningOk = () => jest.fn().mockResolvedValue({ ok: true });

  beforeEach(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'validated-routes-'));
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
      photos: { findFirst: jest.fn(), create: stubReturningOk() },
      envocc_card_files: {
        findFirst: jest.fn(),
        create: stubReturningOk(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [
        UsersController,
        UserCardRequestController,
        UserFileController,
        UserMemberController,
        UserRequestController,
      ],
      providers: [
        JwtAccessStrategy,
        FilesService,
        { provide: PrismaService, useValue: prisma },
        testConfig({ ACCESS_TOKEN_SECRET: ACCESS_SECRET }),
        {
          provide: UsersService,
          useValue: {
            getUserById: stubReturningOk(),
            updateUser: stubReturningOk(),
            getUserRequestForm: stubReturningOk(),
            getUserPrintExpForm: stubReturningOk(),
            createNewCardRequest: stubReturningOk(),
          },
        },
        {
          provide: ExperiencesService,
          useValue: {
            getAllExperience: stubReturningOk(),
            addExperinces: stubReturningOk(),
            editExperience: stubReturningOk(),
            deleteExperience: stubReturningOk(),
          },
        },
        {
          provide: MembersService,
          useValue: {
            setQrPassword: stubReturningOk(),
            getMember: stubReturningOk(),
          },
        },
        {
          provide: RequestService,
          useValue: {
            getCurrentStatus: stubReturningOk(),
            updateStatus: stubReturningOk(),
          },
        },
      ],
    }).compile();

    app = await startApp(moduleRef);

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

  const call = ({ method, path, body, upload }: Route) => {
    const req = request(app.getHttpServer())
      [method](path)
      .set('Cookie', cookie);
    if (upload) {
      return req.attach(upload.field, Buffer.from('fake'), upload.filename);
    }
    return body ? req.send(body) : req;
  };

  const uploadPhoto = () =>
    call({ method: 'post', path: '/users/me/photo', upload: photoUpload });

  const uploadEnvcard = () =>
    call({ method: 'post', path: '/users/me/envcard', upload: envcardUpload });

  const filesOnDisk = () => readdirSync(join(workDir, 'assets'));

  describe('unvalidated user', () => {
    beforeEach(() => {
      isValidate = false;
    });

    it.each(blockedRoutes)(
      'gets 403 user not validated on $method $path',
      async (route) => {
        const res = await call(route);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('user not validated');
      },
    );

    it.each(allowedRoutes)('gets 2xx on $method $path', async (route) => {
      const res = await call(route);

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });

    it('a blocked photo upload leaves no file on disk and no photos row', async () => {
      await uploadPhoto();

      expect(filesOnDisk()).toEqual([]);
      expect(prisma.photos.create).not.toHaveBeenCalled();
    });

    it('a blocked envcard upload leaves no file on disk and no envocc_card_files row', async () => {
      await uploadEnvcard();

      expect(filesOnDisk()).toEqual([]);
      expect(prisma.envocc_card_files.create).not.toHaveBeenCalled();
    });
  });

  describe('validated user', () => {
    beforeEach(() => {
      isValidate = true;
    });

    it('a photo upload is stored on disk and in photos', async () => {
      await uploadPhoto();

      expect(filesOnDisk()).toHaveLength(1);
      expect(prisma.photos.create).toHaveBeenCalledTimes(1);
    });

    it.each(blockedRoutes)(
      'is not blocked on $method $path',
      async ({ validatedStatus, ...route }) => {
        const res = await call(route);

        expect(res.status).toBe(validatedStatus);
      },
    );
  });

  it('lets the same session through once an admin validates it', async () => {
    isValidate = false;
    expect((await uploadPhoto()).status).toBe(403);

    isValidate = true;
    expect((await uploadPhoto()).status).toBe(201);
  });
});
