import { existsSync, readdirSync } from 'fs';
import { basename, join } from 'path';
import { addStatusEntry, lockUser } from 'src/request/status-history';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const PNG = Buffer.from('fake-png');
const REPLACE_REFUSED =
  'photo can be replaced only at request status 1, 2 or 3';

describe('Replace photo (PUT users/me/photo)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const assets = () => readdirSync(join(world.workDir(), 'assets')).sort();

  const replace = (user: number) =>
    world.asUser(user).put('/users/me/photo').attach('photo', PNG, 'p.png');

  const photosOf = (user: number) =>
    world.prisma.photos.findMany({ where: { userId: user } });

  it.each([1, 2, 3])('replaces the photo at status %i', async (status) => {
    const user = await world.createUser({
      history: Array.from({ length: status + 1 }, (_, i) => i),
    });
    const oldUrl = await world.giveFile(user, 'photo');

    const res = await replace(user);

    const rows = await photosOf(user);
    expect(res.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(res.body).toEqual({ msg: 'photo replaced', id: rows[0].id });
    expect(rows[0].url).not.toBe(oldUrl);
    expect(rows[0].filename).toMatch(/^photo-.*\.png$/);
    expect(existsSync(oldUrl)).toBe(false);
    expect(existsSync(rows[0].url!)).toBe(true);
  });

  it('creates the photo when there is none yet', async () => {
    const user = await world.createUser({ history: [0, 1] });

    const res = await replace(user);

    const rows = await photosOf(user);
    expect(res.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(existsSync(rows[0].url!)).toBe(true);
  });

  it('succeeds when the old file is already missing from disk', async () => {
    const user = await world.createUser({ history: [0, 1] });
    const oldUrl = await world.giveFile(user, 'photo');
    await world.prisma.photos.updateMany({
      where: { userId: user },
      data: { url: `${oldUrl}.gone` },
    });

    const res = await replace(user);

    const rows = await photosOf(user);
    expect(res.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(existsSync(rows[0].url!)).toBe(true);
  });

  it.each([
    ['status 4', [0, 1, 2, 3, 4], REPLACE_REFUSED],
    ['status 15', [0, 1, 15], REPLACE_REFUSED],
    ['unapproved', [0], 'user not validated'],
  ])(
    'refuses at %s and leaves the old photo untouched',
    async (_, history, message) => {
      const user = await world.createUser({ history });
      const oldUrl = await world.giveFile(user, 'photo');
      const before = assets();

      const res = await replace(user);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ message });
      expect((await photosOf(user)).map((r) => r.url)).toEqual([oldUrl]);
      expect(existsSync(oldUrl)).toBe(true);
      expect(assets()).toEqual(before);
    },
  );

  describe('racing another writer of the same card request', () => {
    const updateStatus = (user: number, from: number, to: number) =>
      world.asAdmin(ADMIN.UNIT).post('/admins/users/requests/update').send({
        user,
        current_status: from,
        next_status: to,
        request_type: 1,
        description: '',
      });

    it('two replaces at once leave one photo row and one file', async () => {
      const user = await world.createUser({ history: [0, 1] });
      await world.giveFile(user, 'photo');

      const results = await Promise.all([replace(user), replace(user)]);

      const rows = await photosOf(user);
      expect(results.map((r) => r.status)).toEqual([200, 200]);
      expect(rows).toHaveLength(1);
      expect(assets()).toEqual([basename(rows[0].url!)]);
    });

    it('never leaves a replaced photo behind at status 4', async () => {
      const user = await world.createUser({ history: [0, 1, 2, 3] });
      const oldUrl = await world.giveFile(user, 'photo');

      const [res, moved] = await Promise.all([
        replace(user),
        updateStatus(user, 3, 4),
      ]);

      const rows = await photosOf(user);
      expect(moved.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([0, 1, 2, 3, 4]);
      expect(rows).toHaveLength(1);
      if (res.status === 200) {
        expect(rows[0].url).not.toBe(oldUrl);
      } else {
        expect(res.status).toBe(403);
        expect(rows[0].url).toBe(oldUrl);
      }
      expect(assets()).toEqual([basename(rows[0].url!)]);
    });

    it('waits for a status change already in flight and then sees it', async () => {
      const user = await world.createUser({ history: [0, 1, 2, 3] });
      const oldUrl = await world.giveFile(user, 'photo');
      let locked!: () => void;
      const lockHeld = new Promise<void>((resolve) => (locked = resolve));

      const moveTo4 = world.prisma.$transaction(async (tx) => {
        await lockUser(tx, user);
        locked();
        await new Promise((r) => setTimeout(r, 300));
        await addStatusEntry(tx, { userId: user, status: 4, requestType: 1 });
      });
      await lockHeld;
      const [res] = await Promise.all([replace(user), moveTo4]);

      expect(res.status).toBe(403);
      expect((await photosOf(user)).map((r) => r.url)).toEqual([oldUrl]);
      expect(assets()).toEqual([basename(oldUrl)]);
    });
  });

  it('still refuses a second photo on POST', async () => {
    const user = await world.createUser({ history: [0, 1] });
    const oldUrl = await world.giveFile(user, 'photo');
    const before = assets();

    const res = await world
      .asUser(user)
      .post('/users/me/photo')
      .attach('photo', PNG, 'p.png');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'user already has file(s)' });
    expect((await photosOf(user)).map((r) => r.url)).toEqual([oldUrl]);
    expect(assets()).toEqual(before);
  });
});
