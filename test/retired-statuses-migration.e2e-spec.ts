import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const MIGRATION = readFileSync(
  join(
    __dirname,
    '../prisma/migrations/20261120090000_move_users_off_retired_request_statuses/migration.sql',
  ),
  'utf8',
);

describe('Migration: moving users off Request Statuses 2, 3 and 5', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const migrate = () => world.prisma.$executeRawUnsafe(MIGRATION);

  const entriesOf = (userId: number) =>
    world.prisma.requests.findMany({
      where: { userId },
      orderBy: [{ date_update: 'asc' }, { id: 'asc' }],
    });

  // Every entry signed by an admin, so the migrated entry's lack of one shows.
  const createUser = async (history: number[], requestType = 1) => {
    const user = await world.createUser({ history, requestType });
    await world.prisma.requests.updateMany({
      where: { userId: user },
      data: { approver: ADMIN.UNIT, description: 'ก่อนย้าย' },
    });
    return user;
  };

  it.each([
    [2, 6, 1],
    [3, 1, 2],
    [5, 4, 11],
  ])(
    'appends one entry moving a user at %i to %i, keeping Request Type %i',
    async (from, to, requestType) => {
      const user = await createUser([0, 1, from], requestType);
      const before = await entriesOf(user);

      await migrate();

      const after = await entriesOf(user);
      expect(after.slice(0, -1)).toEqual(before);
      expect(after.at(-1)).toMatchObject({
        request_status: to,
        request_type: requestType,
        approver: null,
        description: `ย้ายอัตโนมัติ: เลิกใช้สถานะ ${from}`,
      });
      expect(await world.historyOf(user)).toEqual([0, 1, from, to]);
    },
  );

  it.each([
    ['at 0', [0]],
    ['at 1', [0, 1]],
    ['at 4 after passing through 2 and 3', [0, 1, 2, 3, 4]],
    ['at 6 after passing through 5', [0, 1, 4, 5, 4, 7, 6]],
    ['at 15', [0, 1, 4, 7, 8, 9, 15]],
    ['with no Status History', []],
  ])('leaves a user %s untouched', async (_, history) => {
    const user = await createUser(history);
    const before = await entriesOf(user);

    await migrate();

    expect(await entriesOf(user)).toEqual(before);
  });

  it('moves each user once, so running it again changes nothing', async () => {
    const users = [
      await createUser([0, 1, 2]),
      await createUser([0, 1, 3]),
      await createUser([0, 1, 4, 5]),
    ];

    expect(await migrate()).toBe(3);
    expect(await migrate()).toBe(0);

    expect(await Promise.all(users.map(world.historyOf))).toEqual([
      [0, 1, 2, 6],
      [0, 1, 3, 1],
      [0, 1, 4, 5, 4],
    ]);
  });
});
