import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

// Status 0 alone leaves the user unapproved; any later status means approved
// (see createUser).
const UNAPPROVED = [0];
const APPROVED = [0, 1];

describe('Experience form (GET users/me/requests/exp)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const expForm = (session: ReturnType<CardRequestWorld['asUser']>) =>
    session.get('/users/me/requests/exp');

  const giveExperience = (userId: number) =>
    world.prisma.experiences.create({
      data: { userId, exp_office: 'Office A', exp_position: 'Officer' },
    });

  it.each([
    ['an unapproved', false, UNAPPROVED],
    ['an approved', true, APPROVED],
  ])(
    'gives %s user their names, experiences and is_validate: %s',
    async (_, isValidate, history) => {
      const user = await world.createUser({ history });
      await giveExperience(user);

      const res = await expForm(world.asUser(user));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        username: 'user1',
        fname_th: 'ชื่อ1',
        lname_en: 'Surname',
        experiences: [{ exp_office: 'Office A', exp_position: 'Officer' }],
        is_validate: isValidate,
      });
    },
  );

  it('shows is_validate: true to the same session once an admin approves the user', async () => {
    const user = await world.createUser({ history: UNAPPROVED });
    const session = world.asUser(user);
    expect((await expForm(session)).body).toMatchObject({
      is_validate: false,
    });

    const approve = await world
      .asAdmin(ADMIN.UNIT)
      .patch(`/admins/users/validate/${user}`);
    expect(approve.status).toBe(200);

    expect((await expForm(session)).body).toMatchObject({
      is_validate: true,
    });
  });
});
