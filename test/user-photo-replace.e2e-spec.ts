import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
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
