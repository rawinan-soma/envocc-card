import {
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const ISSUED = [0, 1, 4, 7, 8, 9, 15];
const REFUSED = 'a new card can be requested only at request status 15 or 16';

describe('Starting a request for a new card (POST users/me/card)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const startRequest = (userId: number, requestType: number) =>
    world
      .asUser(userId)
      .post(`/users/me/card?requestType=${requestType}`)
      .send({ user: { fname_th: 'ชื่อใหม่' } });

  const latestEntry = (userId: number) =>
    world.prisma.requests.findFirstOrThrow({
      where: { userId },
      orderBy: [{ date_update: 'desc' }, { id: 'desc' }],
    });

  const fnameOf = async (userId: number) =>
    (await world.prisma.users.findFirstOrThrow({ where: { id: userId } }))
      .fname_th;

  it.each([
    [15, ISSUED],
    [16, [...ISSUED, 16]],
  ])(
    'starts the request at status 1 from status %i and saves the new details',
    async (_, history) => {
      const user = await world.createUser({ history });

      const res = await startRequest(user, 5);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...history, 1]);
      expect(await latestEntry(user)).toMatchObject({
        request_status: 1,
        request_type: 5,
        approver: null,
      });
      expect(await fnameOf(user)).toBe('ชื่อใหม่');
    },
  );

  it.each([
    ['1', [0, 1]],
    ['4', [0, 1, 4]],
    ['7', [0, 1, 4, 7]],
    ['14', [...ISSUED.slice(0, -1), 12, 13, 14]],
    ['1 of a request already started', [...ISSUED, 1]],
  ])('refuses at status %s with 403, saving nothing', async (_, history) => {
    const user = await world.createUser({ history });
    const before = await fnameOf(user);

    const res = await startRequest(user, 2);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: REFUSED });
    expect(await world.historyOf(user)).toEqual(history);
    expect(await fnameOf(user)).toBe(before);
  });

  it('lets only one of two requests started at once through', async () => {
    const user = await world.createUser({ history: ISSUED });

    const results = await Promise.all([
      startRequest(user, 2),
      startRequest(user, 3),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 403]);
    expect(await world.historyOf(user)).toEqual([...ISSUED, 1]);
  });
});
