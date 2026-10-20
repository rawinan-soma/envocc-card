import { addStatusEntry } from 'src/request/status-history';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

describe('addStatusEntry', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  it('adds the new Request Status and reports the one it moved from', async () => {
    const userId = await world.createUser({ history: [0, 1] });

    const { entry, from } = await addStatusEntry(world.prisma, {
      userId,
      status: 3,
      requestType: 1,
      approver: ADMIN.UNIT,
    });

    expect(from).toBe(1);
    expect(entry.request_status).toBe(3);
    expect(await world.historyOf(userId)).toEqual([0, 1, 3]);
  });

  it("reports no from-status for a user's first entry", async () => {
    const userId = await world.createUser({ history: [] });

    const { from } = await addStatusEntry(world.prisma, {
      userId,
      status: 0,
      requestType: 1,
    });

    expect(from).toBeNull();
    expect(await world.historyOf(userId)).toEqual([0]);
  });

  it('writes inside an existing transaction and rolls back with it', async () => {
    const userId = await world.createUser({ history: [0, 1, 3] });

    const { from } = await world.prisma.$transaction((tx) =>
      addStatusEntry(tx, { userId, status: 4, requestType: 1 }),
    );
    expect(from).toBe(3);

    await expect(
      world.prisma.$transaction(async (tx) => {
        await addStatusEntry(tx, { userId, status: 7, requestType: 1 });
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');

    expect(await world.historyOf(userId)).toEqual([0, 1, 3, 4]);
  });

  it('uses the from-status it is given', async () => {
    const userId = await world.createUser({ history: [0, 1, 3] });

    const { from } = await world.prisma.$transaction(async (tx) => {
      await tx.requests.deleteMany({ where: { userId } });
      return addStatusEntry(tx, { userId, status: 0, requestType: 1, from: 3 });
    });

    expect(from).toBe(3);
    expect(await world.historyOf(userId)).toEqual([0]);
  });
});
