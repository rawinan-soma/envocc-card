import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

type Field = 'govCard' | 'requestFile' | 'experienceForm' | 'photo';

const fileNameOf = (field: Field) =>
  field === 'photo' ? 'me.jpg' : `${field}.pdf`;

describe('Step 3: uploading documents (POST admins/users/:userId/files)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const upload = (userId: number, fields: Field[]) => {
    let req = world.asAdmin(ADMIN.UNIT).post(`/admins/users/${userId}/files`);
    for (const field of fields) {
      req = req.attach(field, Buffer.from('fake'), fileNameOf(field));
    }
    return req;
  };

  const assets = () => readdirSync(join(world.workDir(), 'assets'));

  it('requires a government card from a user who has none', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, ['requestFile']);

    expect(res.status).toBe(400);
    expect(await world.historyOf(user)).toEqual([0, 1, 3]);
    expect(await world.filesOf(user, 'reqFile')).toEqual([]);
    expect(assets()).toEqual([]);
  });

  it('accepts a government card without a request file and moves them to 4', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, ['govCard']);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
    expect(
      await world.prisma.requests.findFirst({
        where: { userId: user, request_status: 4 },
      }),
    ).toMatchObject({ request_type: 1 });
    expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
    expect(await world.filesOf(user, 'reqFile')).toEqual([]);
  });

  it('keeps the request type of a type 2 request when moving them to 4', async () => {
    const user = await world.createUser({ history: [0, 1, 3], requestType: 2 });

    const res = await upload(user, ['govCard']);

    expect(res.status).toBe(201);
    expect(
      await world.prisma.requests.findFirst({
        where: { userId: user, request_status: 4 },
      }),
    ).toMatchObject({ request_type: 2 });
  });

  it('stores the experience form when no request file is sent', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, ['govCard', 'experienceForm']);

    expect(res.status).toBe(201);
    expect(await world.filesOf(user, 'expfile')).toHaveLength(1);
    expect(await world.filesOf(user, 'reqFile')).toEqual([]);
  });

  it('accepts all documents from a first-time user and moves them to 4', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, [
      'govCard',
      'requestFile',
      'experienceForm',
    ]);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
    expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
    expect(await world.filesOf(user, 'reqFile')).toHaveLength(1);
    expect(await world.filesOf(user, 'expfile')).toHaveLength(1);
  });

  it('lets a user who kept their government card advance to 4 without uploading it again', async () => {
    const user = await world.createUser({ history: [0, 1, 3, 4, 1, 3] });
    const kept = await world.giveFile(user, 'govcard');

    const res = await upload(user, ['requestFile']);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4, 1, 3, 4]);
    expect(await world.filesOf(user, 'govcard')).toEqual([{ url: kept }]);
    expect(existsSync(kept)).toBe(true);
  });

  it('replaces the existing file of each type that is uploaded again', async () => {
    const user = await world.createUser({ history: [0, 1, 3, 4, 1, 3] });
    const oldGovcard = await world.giveFile(user, 'govcard');
    const oldReqFile = await world.giveFile(user, 'reqFile');
    const oldExpfile = await world.giveFile(user, 'expfile');

    const res = await upload(user, [
      'govCard',
      'requestFile',
      'experienceForm',
    ]);

    expect(res.status).toBe(201);
    for (const [kind, old] of [
      ['govcard', oldGovcard],
      ['reqFile', oldReqFile],
      ['expfile', oldExpfile],
    ] as const) {
      const files = await world.filesOf(user, kind);
      expect(files).toHaveLength(1);
      expect(files[0].url).not.toBe(old);
      expect(existsSync(files[0].url)).toBe(true);
      expect(existsSync(old)).toBe(false);
    }
  });

  describe('by the user (POST users/me/files)', () => {
    const uploadAsUser = (userId: number, fields: Field[]) => {
      let req = world.asUser(userId).post('/users/me/files');
      for (const field of fields) {
        req = req.attach(field, Buffer.from('fake'), fileNameOf(field));
      }
      return req;
    };

    it('stores the government card and experience form and moves them to 4', async () => {
      const user = await world.createUser({ history: [0, 1, 3] });

      const res = await uploadAsUser(user, ['govCard', 'experienceForm']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
      expect(
        await world.prisma.requests.findFirst({
          where: { userId: user, request_status: 4 },
        }),
      ).toMatchObject({ request_type: 1 });
      expect(
        await world.prisma.gov_card_files.findMany({ where: { userId: user } }),
      ).toEqual([expect.objectContaining({ adminId: null })]);
      expect(
        await world.prisma.exp_files.findMany({ where: { userId: user } }),
      ).toEqual([expect.objectContaining({ adminId: null })]);
      expect(await world.filesOf(user, 'photo')).toEqual([]);
      expect(assets()).toHaveLength(2);
    });

    it('keeps the request type of a type 2 request when moving them to 4', async () => {
      const user = await world.createUser({
        history: [0, 1, 3],
        requestType: 2,
      });

      const res = await uploadAsUser(user, ['govCard', 'experienceForm']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
      expect(
        await world.prisma.requests.findFirst({
          where: { userId: user, request_status: 4 },
        }),
      ).toMatchObject({ request_type: 2 });
    });

    it('accepts the upload from request status 1 and moves the user to 4', async () => {
      const user = await world.createUser({ history: [0, 1] });

      const res = await uploadAsUser(user, ['govCard', 'experienceForm']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([0, 1, 4]);
      expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
      expect(await world.filesOf(user, 'expfile')).toHaveLength(1);
    });

    it('accepts an upload without an experience form from a user who has none', async () => {
      const user = await world.createUser({ history: [0, 1, 3] });

      const res = await uploadAsUser(user, ['govCard']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
      expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
      expect(await world.filesOf(user, 'expfile')).toEqual([]);
    });

    it('requires a government card from a user who has none, storing nothing', async () => {
      const user = await world.createUser({ history: [0, 1, 3] });

      const res = await uploadAsUser(user, ['experienceForm']);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'govcard is required' });
      expect(await world.historyOf(user)).toEqual([0, 1, 3]);
      expect(await world.filesOf(user, 'expfile')).toEqual([]);
      expect(assets()).toEqual([]);
    });

    it('lets a user keep the stored documents and upload only a photo', async () => {
      const user = await world.createUser({ history: [0, 1, 3, 4, 2, 3] });
      const govcard = await world.giveFile(user, 'govcard');
      const expfile = await world.giveFile(user, 'expfile');

      const res = await uploadAsUser(user, ['photo']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4, 2, 3, 4]);
      expect(await world.filesOf(user, 'govcard')).toEqual([{ url: govcard }]);
      expect(await world.filesOf(user, 'expfile')).toEqual([{ url: expfile }]);
      expect(await world.filesOf(user, 'photo')).toHaveLength(1);
    });

    it('replaces the stored photo when a new one is sent', async () => {
      const user = await world.createUser({ history: [0, 1, 3] });
      const oldPhoto = await world.giveFile(user, 'photo');

      const res = await uploadAsUser(user, [
        'govCard',
        'experienceForm',
        'photo',
      ]);

      expect(res.status).toBe(201);
      const photos = await world.filesOf(user, 'photo');
      expect(photos).toHaveLength(1);
      expect(photos[0].url).not.toBe(oldPhoto);
      expect(existsSync(photos[0].url)).toBe(true);
      expect(existsSync(oldPhoto)).toBe(false);
    });

    it.each([2, 4])(
      'answers 403 at request status %i, storing nothing',
      async (status) => {
        const user = await world.createUser({ history: [0, 1, status] });

        const res = await uploadAsUser(user, ['govCard', 'experienceForm']);

        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({
          message: 'documents can be uploaded only at request status 1, 3',
        });
        expect(await world.historyOf(user)).toEqual([0, 1, status]);
        expect(await world.filesOf(user, 'govcard')).toEqual([]);
        expect(assets()).toEqual([]);
      },
    );

    it('answers 403 for a user with no status history', async () => {
      const user = await world.createUser({ history: [] });

      const res = await uploadAsUser(user, ['govCard', 'experienceForm']);

      expect(res.status).toBe(403);
      expect(assets()).toEqual([]);
    });

    it('rejects a photo that is not an image, storing nothing', async () => {
      const user = await world.createUser({ history: [0, 1, 3] });

      const res = await world
        .asUser(user)
        .post('/users/me/files')
        .attach('govCard', Buffer.from('fake'), 'govCard.pdf')
        .attach('photo', Buffer.from('fake'), 'photo.pdf');

      expect(res.status).toBe(400);
      expect(assets()).toEqual([]);
    });

    it('answers 401 to an admin session on the user route', async () => {
      const user = await world.createUser({ history: [0, 1, 3] });

      const res = await world
        .asAdmin(ADMIN.UNIT)
        .post('/users/me/files')
        .attach('govCard', Buffer.from('fake'), 'govCard.pdf');

      expect(res.status).toBe(401);
      expect(await world.historyOf(user)).toEqual([0, 1, 3]);
      expect(assets()).toEqual([]);
    });

    it('answers 401 to a user session on the admin route', async () => {
      const user = await world.createUser({ history: [0, 1, 3] });

      const res = await world
        .asUser(user)
        .post(`/admins/users/${user}/files`)
        .attach('govCard', Buffer.from('fake'), 'govCard.pdf');

      expect(res.status).toBe(401);
      expect(await world.historyOf(user)).toEqual([0, 1, 3]);
      expect(assets()).toEqual([]);
    });
  });

  it('answers 404 for a user that does not exist, storing nothing', async () => {
    const res = await upload(999, ['govCard', 'requestFile']);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'user not found' });
    expect(assets()).toEqual([]);
  });

  it('lets an admin upload at any request status', async () => {
    const user = await world.createUser({ history: [0, 1, 4] });

    const res = await upload(user, ['govCard']);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 4, 4]);
  });
});
