import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

describe('Admin reads a user request form and experience form', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const forms = [
    ['request form', 'form'],
    ['experience form', 'exp'],
  ] as const;

  describe.each(forms)('%s', (_, form) => {
    const path = (id: number | string) =>
      `/admins/users/${id}/requests/${form}`;

    it.each([
      ['an unvalidated', [0]],
      ['a validated', [0, 1]],
    ])("gives the admin %s user's data", async (_label, history) => {
      await world.createUser({ history: [0, 1] });
      const target = await world.createUser({ history });
      await world.prisma.experiences.create({
        data: {
          userId: target,
          exp_office: 'Office A',
          exp_position: 'Officer',
        },
      });

      const res = await world.asAdmin(ADMIN.UNIT).get(path(target));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        username: 'user2',
        is_validate: history.length > 1,
        experiences: [{ exp_office: 'Office A' }],
      });
      if (form === 'form') {
        expect(res.body).toMatchObject({ id: target, cid: 'cid-2' });
      }
    });

    it('answers 404 for a user that does not exist', async () => {
      const res = await world.asAdmin(ADMIN.UNIT).get(path(9999));

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'user not found' });
    });

    it('answers 400 for a non-numeric id', async () => {
      const res = await world.asAdmin(ADMIN.UNIT).get(path('abc'));

      expect(res.status).toBe(400);
    });

    it('answers 401 to a user cookie', async () => {
      const user = await world.createUser({ history: [0, 1] });

      const res = await world.asUser(user).get(path(user));

      expect(res.status).toBe(401);
    });

    it('answers 401 with no cookie', async () => {
      const user = await world.createUser({ history: [0, 1] });

      const res = await world.anonymous().get(path(user));

      expect(res.status).toBe(401);
    });
  });
});
