import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const ISSUED = [0, 1, 4, 7, 8, 9, 15];
const QRCODE = '55556666';

describe('The Old card while a request for a new card runs', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const cardHolder = async () => {
    const user = await world.createUser({ history: ISSUED });
    await world.giveMember(user, { member_no: 5, qrcode: QRCODE });
    return user;
  };

  const startRequest = (userId: number, requestType: number, body = {}) =>
    world
      .asUser(userId)
      .post(`/users/me/card?requestType=${requestType}`)
      .send(body);

  const qrCheck = () =>
    world.anonymous().get(`/common/qrcode?qrcode_number=${QRCODE}`);

  const onlineCard = (userId: number) =>
    world.asUser(userId).get('/users/me/envcard/qrcode');

  const expectValid = async (userId: number) => {
    const qr = await qrCheck();
    expect(qr.status).toBe(200);
    expect(qr.body).toMatchObject({ member_no: 5 });
    expect((await onlineCard(userId)).status).toBe(200);
  };

  const expectNotValid = async (userId: number) => {
    const qr = await qrCheck();
    expect(qr.status).toBe(400);
    expect(qr.body).toMatchObject({ message: 'cannot generate qr code' });
    expect((await onlineCard(userId)).status).toBe(404);
  };

  const walkToIssued = async (userId: number) => {
    const admin = world.asAdmin(ADMIN.MINISTRY);
    const update = (current_status: number, next_status: number) =>
      admin.post('/admins/users/requests/update').send({
        user: userId,
        current_status,
        next_status,
        request_type: 1,
        description: '',
      });
    const steps: [string, () => Promise<{ status: number }>][] = [
      [
        'document upload',
        () =>
          world
            .asUser(userId)
            .post('/users/me/files')
            .attach('govCard', Buffer.from('fake'), 'govCard.pdf')
            .attach('photo', Buffer.from('fake'), 'me.jpg'),
      ],
      ['check 4 → 7', () => update(4, 7)],
      [
        'signing method',
        () =>
          admin.post('/admins/members').send({ userId, signature_method: 8 }),
      ],
      [
        'approval date',
        () =>
          admin
            .patch(`/admins/members/${userId}/activate`)
            .send({ startDate: '2026-05-01' }),
      ],
    ];
    for (const [step, send] of steps) {
      expect(`${step}: ${(await send()).status}`).toMatch(/: 20[01]$/);
      await expectNotValid(userId);
    }
    const printed = await admin.get(`/admins/members/${userId}`);
    expect(printed.status).toBe(200);
    expect(printed.body).toMatchObject({
      member_no: 5,
      is_active: false,
      start_date: '2026-05-01T00:00:00.000Z',
    });
    expect((await update(9, 15)).status).toBe(201);
  };

  it.each([3, 4, 5, 6, 7, 8, 9, 10])(
    'stops being valid when a request of type %i starts',
    async (requestType) => {
      const user = await cardHolder();
      await expectValid(user);

      expect((await startRequest(user, requestType)).status).toBe(201);

      await expectNotValid(user);
    },
  );

  it('stays valid while a request of type 2 runs', async () => {
    const user = await cardHolder();
    world.setToday('2031-01-15');

    expect((await startRequest(user, 2)).status).toBe(201);

    await expectValid(user);
  });

  it('stops being valid when an admin deactivates it while a request of type 2 runs', async () => {
    const user = await cardHolder();
    world.setToday('2031-01-15');
    expect((await startRequest(user, 2)).status).toBe(201);

    const res = await world
      .asAdmin(ADMIN.MINISTRY)
      .patch(`/admins/members/${user}/deactivate`);

    expect(res.status).toBe(200);
    await expectNotValid(user);
    expect(
      await world.prisma.members.count({
        where: { userId: user, is_active: true },
      }),
    ).toBe(0);
  });

  it('refuses to deactivate a user none of whose cards is valid', async () => {
    const user = await cardHolder();
    expect((await startRequest(user, 4)).status).toBe(201);

    const res = await world
      .asAdmin(ADMIN.MINISTRY)
      .patch(`/admins/members/${user}/deactivate`);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'member already inactivated' });
  });

  it.each([2, 3])(
    'stays not valid when a request of type %i starts from a cancelled card (16)',
    async (requestType) => {
      const user = await world.createUser({ history: [...ISSUED, 16] });
      await world.giveMember(user, { member_no: 5, qrcode: QRCODE });
      world.setToday('2031-01-15');

      expect((await startRequest(user, requestType)).status).toBe(201);

      await expectNotValid(user);
    },
  );

  it('is replaced by the new card, valid once the request reaches 15', async () => {
    const user = await cardHolder();
    expect((await startRequest(user, 4)).status).toBe(201);

    await walkToIssued(user);

    await expectValid(user);
    expect((await onlineCard(user)).body).toMatchObject({
      start_date: '2026-05-01T00:00:00.000Z',
      end_date: '2031-04-30T00:00:00.000Z',
    });
  });

  it.each([
    ['an unknown Request Type', 12, {}, 400],
    ['a detail that cannot be saved', 4, { user: { positionId: 999999 } }, 400],
  ])(
    'stays valid when starting the request is refused for %s',
    async (_, requestType, body, status) => {
      const user = await cardHolder();

      expect((await startRequest(user, requestType, body)).status).toBe(status);

      expect(await world.historyOf(user)).toEqual(ISSUED);
      await expectValid(user);
    },
  );
});
