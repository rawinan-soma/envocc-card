import { existsSync, readdirSync } from 'fs';
import { dirname } from 'path';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
  FileKind,
  ORG,
} from './support/card-request-world';

describe("An admin's reach over a user's files (admins/users/:userId/files)", () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const KINDS: FileKind[] = ['policeReport', 'govcard'];

  const call = (
    method: 'get' | 'delete',
    adminId: number,
    user: number,
    kind: string,
  ) => world.asAdmin(adminId)[method](`/admins/users/${user}/files/${kind}`);

  describe.each(KINDS)('%s', (kind) => {
    it.each([
      ['its own organization', ADMIN.UNIT],
      ['an organization above it', ADMIN.DEPARTMENT],
      ['the ministry', ADMIN.MINISTRY],
    ])(
      "lets an admin of %s read and then delete the user's file",
      async (_, adminId) => {
        const user = await world.createUser({ orgId: ORG.UNIT, history: [0] });
        const url = await world.giveFile(user, kind);

        const read = await call('get', adminId, user, kind);
        expect(read.status).toBe(200);
        expect(read.body).toMatchObject({ userId: user, url });

        expect((await call('delete', adminId, user, kind)).status).toBe(200);
        expect(await world.filesOf(user, kind)).toEqual([]);
        expect(existsSync(url)).toBe(false);
      },
    );

    it.each([
      ['another department', ADMIN.OTHER_DEPARTMENT, ORG.UNIT],
      ['an organization below the user', ADMIN.UNIT, ORG.PROVINCE],
    ])(
      'refuses an admin of %s with 403 on GET and DELETE, keeping the file',
      async (_, adminId, orgId) => {
        const user = await world.createUser({ orgId, history: [0] });
        const url = await world.giveFile(user, kind);

        for (const method of ['get', 'delete'] as const) {
          const res = await call(method, adminId, user, kind);

          expect(res.status).toBe(403);
          expect(res.body).toMatchObject({
            message: 'user is outside your organization',
          });
        }
        expect(await world.filesOf(user, kind)).toEqual([{ url }]);
        expect(existsSync(url)).toBe(true);
      },
    );
  });

  it.each(['get', 'delete'] as const)(
    'answers 404 to %s of a file kind that does not exist',
    async (method) => {
      const user = await world.createUser({ orgId: ORG.UNIT, history: [0] });

      const res = await call(method, ADMIN.UNIT, user, 'policereport');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'no file kind policereport' });
    },
  );

  describe('Document upload (POST admins/users/:userId/files)', () => {
    const upload = (adminId: number, user: number) =>
      world
        .asAdmin(adminId)
        .post(`/admins/users/${user}/files`)
        .attach('govCard', Buffer.from('fake'), 'govCard.pdf');

    it.each([
      ['its own organization', ADMIN.UNIT],
      ['an organization above it', ADMIN.DEPARTMENT],
      ['the ministry', ADMIN.MINISTRY],
    ])("lets an admin of %s send the user's documents", async (_, adminId) => {
      const user = await world.createUser({ orgId: ORG.UNIT, history: [1] });

      expect((await upload(adminId, user)).status).toBe(201);

      expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
      expect(await world.historyOf(user)).toEqual([1, 4]);
    });

    it.each([
      ['another department', ADMIN.OTHER_DEPARTMENT, ORG.UNIT],
      ['an organization below the user', ADMIN.UNIT, ORG.PROVINCE],
    ])(
      'refuses an admin of %s with 403, storing nothing and keeping the status',
      async (_, adminId, orgId) => {
        const user = await world.createUser({ orgId, history: [1] });
        const govcard = await world.giveFile(user, 'govcard');
        const onDisk = readdirSync(dirname(govcard));

        const res = await upload(adminId, user);

        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({
          message: 'user is outside your organization',
        });
        expect(await world.filesOf(user, 'govcard')).toEqual([
          { url: govcard },
        ]);
        expect(readdirSync(dirname(govcard))).toEqual(onDisk);
        expect(await world.historyOf(user)).toEqual([1]);
      },
    );
  });

  it('answers 404 to a user that does not exist', async () => {
    const res = await call('get', ADMIN.MINISTRY, 999, 'govcard');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'user not found' });
  });
});
