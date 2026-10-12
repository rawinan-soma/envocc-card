import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

describe('Status updates outside Revert', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  describe('POST admins/users/requests/update', () => {
    const update = (userId: number, from: number, to: number) =>
      world.asAdmin(ADMIN.UNIT).post('/admins/users/requests/update').send({
        user: userId,
        current_status: from,
        next_status: to,
        request_type: 1,
        description: '',
      });

    const historyEndingAt = (status: number) =>
      [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 15, 16].filter((s) => s < status);

    it.each([
      [13, 1],
      [9, 7],
      [16, 15],
      [4, 0],
      [8, 6],
    ])(
      'rejects %i → %i with 400 pointing to the revert endpoint',
      async (from, to) => {
        const history = [...historyEndingAt(from), from];
        const user = await world.createUser({ history });

        const res = await update(user, from, to);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          message: expect.stringMatching(/requests\/revert/) as string,
        });
        expect(await world.historyOf(user)).toEqual(history);
      },
    );

    it.each([
      [4, 3],
      [6, 7],
      [3, 4],
      [4, 6],
      [13, 15],
      [15, 16],
    ])('accepts %i → %i', async (from, to) => {
      const history = [...historyEndingAt(from), from];
      const user = await world.createUser({ history });

      const res = await update(user, from, to);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...history, to]);
    });
  });

  describe('DELETE admins/users/requests/:id', () => {
    it('no longer exists, and leaves the Status History alone', async () => {
      const user = await world.createUser({ history: [0, 1, 3, 4] });

      const res = await world
        .asAdmin(ADMIN.MINISTRY)
        .delete(`/admins/users/requests/${user}`);

      expect(res.status).toBe(404);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
    });
  });
});
