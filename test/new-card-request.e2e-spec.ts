import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const ISSUED = [0, 1, 4, 7, 8, 9, 15];
const REFUSED = 'a new card can be requested only at request status 15 or 16';
const BAD_TYPE = 'requestType must be one of 2, 3, 4, 5, 6, 7, 8, 9, 10, 11';

const DETAILS = {
  user: { fname_th: 'ชื่อใหม่' },
  experiences: [
    {
      exp_fdate: '2020-01-01',
      exp_ldate: '2023-12-31',
      exp_typeoffice: 1,
      exp_office: 'โรงพยาบาลตัวอย่าง',
      exp_position: 'นักวิชาการสาธารณสุข',
      exp_work: 'งานอาชีวอนามัย',
    },
  ],
};

describe('Starting a request for a new card (POST users/me/card)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const startRequest = (
    userId: number,
    requestType: number | string,
    body: object = DETAILS,
  ) =>
    world
      .asUser(userId)
      .post(`/users/me/card?requestType=${requestType}`)
      .send(body);

  const entriesOf = (userId: number) =>
    world.prisma.requests.findMany({
      where: { userId },
      orderBy: [{ date_update: 'asc' }, { id: 'asc' }],
    });

  const detailsOf = async (userId: number) => ({
    fname_th: (
      await world.prisma.users.findFirstOrThrow({ where: { id: userId } })
    ).fname_th,
    experiences: await world.prisma.experiences.count({ where: { userId } }),
  });

  // The rest of the request, from 1 to 15, by the routes the user and admins
  // use: Document upload, the check, the signing method, the approval date and
  // the print.
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

    const steps = [
      () =>
        world
          .asUser(userId)
          .post('/users/me/files')
          .attach('govCard', Buffer.from('fake'), 'govCard.pdf')
          .attach('photo', Buffer.from('fake'), 'me.jpg'),
      () => update(4, 7),
      () => admin.post('/admins/members').send({ userId, signature_method: 8 }),
      () =>
        admin
          .patch(`/admins/members/${userId}/activate`)
          .send({ startDate: '2027-03-01' }),
      () => update(9, 15),
    ];
    for (const step of steps) {
      const res = await step();
      expect([200, 201]).toContain(res.status);
    }
  };

  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])(
    'starts a request of type %i at status 1 from status 15',
    async (requestType) => {
      const user = await world.createUser({ history: ISSUED });

      const res = await startRequest(user, requestType, {});

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 1]);
      expect((await entriesOf(user)).at(-1)).toMatchObject({
        request_status: 1,
        request_type: requestType,
        approver: null,
      });
    },
  );

  it.each([
    [15, ISSUED],
    [16, [...ISSUED, 16]],
  ])(
    'saves the user and experiences sent along when starting from status %i',
    async (_, history) => {
      const user = await world.createUser({ history });

      const res = await startRequest(user, 5);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...history, 1]);
      expect(await detailsOf(user)).toEqual({
        fname_th: 'ชื่อใหม่',
        experiences: 1,
      });
    },
  );

  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])(
    'refuses at status %i with 403, saving nothing',
    async (status) => {
      const history = [
        ...[0, 1, 4, 7, 8, 9, 12, 13].filter((s) => s < status),
        status,
      ];
      const user = await world.createUser({ history });
      // Approved even at 0, so the refusal shown is this route's own.
      await world.prisma.users.update({
        where: { id: user },
        data: { is_validate: true },
      });
      const before = await detailsOf(user);

      const res = await startRequest(user, 2);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ message: REFUSED });
      expect(await world.historyOf(user)).toEqual(history);
      expect(await detailsOf(user)).toEqual(before);
    },
  );

  it('refuses at status 1 of a request already started, saving nothing', async () => {
    const history = [...ISSUED, 1];
    const user = await world.createUser({ history });
    const before = await detailsOf(user);

    const res = await startRequest(user, 2);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: REFUSED });
    expect(await world.historyOf(user)).toEqual(history);
    expect(await detailsOf(user)).toEqual(before);
  });

  it.each([
    ['type 1', '1', BAD_TYPE],
    ['type 0', '0', BAD_TYPE],
    ['type 12', '12', BAD_TYPE],
    ['a non-number', 'lost', 'Validation failed (numeric string is expected)'],
  ])('refuses %s with 400, saving nothing', async (_, requestType, message) => {
    const user = await world.createUser({ history: ISSUED });
    const before = await detailsOf(user);

    const res = await startRequest(user, requestType);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message });
    expect(await world.historyOf(user)).toEqual(ISSUED);
    expect(await detailsOf(user)).toEqual(before);
  });

  it('lets only one of two requests started at once through', async () => {
    const user = await world.createUser({ history: ISSUED });

    const results = await Promise.all([
      startRequest(user, 2),
      startRequest(user, 3),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 403]);
    expect(await world.historyOf(user)).toEqual([...ISSUED, 1]);
    expect((await detailsOf(user)).experiences).toBe(1);
  });

  it('carries type 3 on every entry from 1 to 15, and keeps the Member Number', async () => {
    const user = await world.createUser({ history: ISSUED });
    await world.giveMember(user, { member_no: 5, qrcode: '55556666' });

    expect((await startRequest(user, 3)).status).toBe(201);
    await walkToIssued(user);

    const entries = await entriesOf(user);
    expect(entries.map((e) => e.request_status)).toEqual([
      ...ISSUED,
      1,
      4,
      7,
      8,
      9,
      15,
    ]);
    expect(entries.map((e) => e.request_type)).toEqual([
      ...ISSUED.map(() => 1),
      ...[1, 4, 7, 8, 9, 15].map(() => 3),
    ]);
    expect(
      await world.prisma.members.findMany({ where: { userId: user } }),
    ).toEqual([expect.objectContaining({ member_no: 5, qrcode: '55556666' })]);
  });

  it('leaves a card cancelled at 16 active again, as the online card, once the request reaches 15', async () => {
    const user = await world.createUser({ history: [...ISSUED, 16] });
    await world.giveMember(user, {
      member_no: 7,
      qrcode: '77778888',
      is_active: false,
    });
    const onlineCard = () => world.asUser(user).get('/users/me/envcard/qrcode');
    expect((await onlineCard()).status).toBe(404);

    expect((await startRequest(user, 4)).status).toBe(201);
    await walkToIssued(user);

    expect(await world.historyOf(user)).toEqual([
      ...ISSUED,
      16,
      1,
      4,
      7,
      8,
      9,
      15,
    ]);
    const res = await onlineCard();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      member_no: 7,
      qrcode: '77778888',
      start_date: '2027-03-01T00:00:00.000Z',
      end_date: '2032-02-29T00:00:00.000Z',
      user: { fname_th: 'ชื่อใหม่' },
    });
  });
});
