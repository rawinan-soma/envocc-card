import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const ISSUED = [0, 1, 4, 7, 8, 9, 15];
const QRCODE = '55556666';
const OLD_CARD = {
  start_date: '2022-03-02T00:00:00.000Z',
  end_date: '2027-03-01T00:00:00.000Z',
};

describe('A request for a new card because the card expired (Request Type 2)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const admin = () => world.asAdmin(ADMIN.MINISTRY);

  // Holds a card from 2 Mar 2022 to 1 Mar 2027, with the photo a type 2
  // request keeps.
  const cardHolder = async () => {
    const user = await world.createUser({ history: ISSUED });
    await world.giveFile(user, 'photo');
    await world.giveMember(user, {
      member_no: 5,
      qrcode: QRCODE,
      start_date: new Date('2022-03-02'),
      end_date: new Date('2027-03-01'),
    });
    return user;
  };

  const startRequest = (userId: number) =>
    world.asUser(userId).post('/users/me/card?requestType=2').send({});

  const update = (
    userId: number,
    current_status: number,
    next_status: number,
  ) =>
    admin().post('/admins/users/requests/update').send({
      user: userId,
      current_status,
      next_status,
      request_type: 1,
      description: '',
    });

  const approve = (userId: number, startDate: string) =>
    admin().patch(`/admins/members/${userId}/activate`).send({ startDate });

  const walkTo8 = async (userId: number) => {
    const steps: [string, () => Promise<{ status: number }>][] = [
      ['start', () => startRequest(userId)],
      [
        'document upload',
        () =>
          world
            .asUser(userId)
            .post('/users/me/files')
            .attach('govCard', Buffer.from('fake'), 'govCard.pdf'),
      ],
      ['check 4 → 7', () => update(userId, 4, 7)],
      [
        'signing method',
        () =>
          admin().post('/admins/members').send({ userId, signature_method: 8 }),
      ],
    ];
    for (const [step, send] of steps) {
      expect(`${step}: ${(await send()).status}`).toMatch(/: 20[01]$/);
    }
    expect((await world.historyOf(userId)).at(-1)).toBe(8);
  };

  const onlineCard = async (userId: number) => {
    const res = await world.asUser(userId).get('/users/me/envcard/qrcode');
    expect(res.status).toBe(200);
    return res.body as { start_date: string; end_date: string };
  };

  const qrCard = async () => {
    const res = await world
      .anonymous()
      .get(`/common/qrcode?qrcode_number=${QRCODE}`);
    expect(res.status).toBe(200);
    return res.body as { start_date: string; end_date: string };
  };

  const datesOf = ({ start_date, end_date }: typeof OLD_CARD) => ({
    start_date,
    end_date,
  });

  describe('starting it', () => {
    it('is refused 31 days before the card ends', async () => {
      const user = await cardHolder();
      world.setToday('2027-01-29');

      const res = await startRequest(user);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        message:
          "a request of type 2 can be started only from 2027-01-30, 30 days before the card's end date",
      });
      expect(await world.historyOf(user)).toEqual(ISSUED);
      expect(
        await world.prisma.members.count({ where: { userId: user } }),
      ).toBe(1);
    });

    it.each([
      ['30 days before the card ends', '2027-01-30'],
      ['on the end date', '2027-03-01'],
      ['after the end date', '2027-09-01'],
    ])('is accepted %s', async (_, today) => {
      const user = await cardHolder();
      world.setToday(today);

      const res = await startRequest(user);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 1]);
    });
  });

  describe('the Approval date', () => {
    it.each([
      ['before', '2027-02-20'],
      ['on', '2027-03-01'],
    ])(
      "is refused %s the Old card's end date while it has not expired",
      async (_, startDate) => {
        const user = await cardHolder();
        world.setToday('2027-02-15');
        await walkTo8(user);

        const res = await approve(user, startDate);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          message:
            "the approval date must be after the Old card's end date, 2027-03-01",
        });
        expect((await world.historyOf(user)).at(-1)).toBe(8);
      },
    );

    it("is accepted the day after the Old card's end date, and the card ends 5 years later", async () => {
      const user = await cardHolder();
      world.setToday('2027-02-15');
      await walkTo8(user);

      const res = await approve(user, '2027-03-02');

      expect(res.status).toBe(200);
      expect((await world.historyOf(user)).at(-1)).toBe(9);
      expect((await admin().get(`/admins/members/${user}`)).body).toMatchObject(
        {
          member_no: 5,
          start_date: '2027-03-02T00:00:00.000Z',
          end_date: '2032-03-01T00:00:00.000Z',
        },
      );
    });

    it('is accepted on any date once the Old card has expired', async () => {
      const user = await cardHolder();
      world.setToday('2027-03-10');
      await walkTo8(user);

      const res = await approve(user, '2027-02-01');

      expect(res.status).toBe(200);
      expect((await world.historyOf(user)).at(-1)).toBe(9);
    });
  });

  describe('the online card and QR verification', () => {
    it('show the Old card until its end date and the new card from its start date', async () => {
      const user = await cardHolder();
      world.setToday('2027-02-15');
      await walkTo8(user);
      expect(datesOf(await onlineCard(user))).toEqual(OLD_CARD);
      expect((await approve(user, '2027-03-02')).status).toBe(200);
      expect((await update(user, 9, 15)).status).toBe(201);

      world.setToday('2027-03-01');
      expect(datesOf(await onlineCard(user))).toEqual(OLD_CARD);
      expect(datesOf(await qrCard())).toEqual(OLD_CARD);

      world.setToday('2027-03-02');
      const newCard = {
        start_date: '2027-03-02T00:00:00.000Z',
        end_date: '2032-03-01T00:00:00.000Z',
      };
      expect(datesOf(await onlineCard(user))).toEqual(newCard);
      expect(datesOf(await qrCard())).toEqual(newCard);
      expect(await onlineCard(user)).toMatchObject({ member_no: 5 });
    });

    it('keep showing the Old card after a Revert during the request', async () => {
      const user = await cardHolder();
      world.setToday('2027-02-15');
      await walkTo8(user);
      expect((await approve(user, '2027-03-02')).status).toBe(200);

      const res = await admin()
        .post(`/admins/users/${user}/requests/revert`)
        .send({ current_status: 9, target_status: 7, description: '' });

      expect(res.status).toBe(201);
      expect(datesOf(await onlineCard(user))).toEqual(OLD_CARD);
      expect(datesOf(await qrCard())).toEqual(OLD_CARD);
    });

    it('show no card once the Old card has expired and the new card is not yet issued', async () => {
      const user = await cardHolder();
      world.setToday('2027-03-10');
      await walkTo8(user);
      expect((await approve(user, '2027-03-10')).status).toBe(200);

      expect(
        (await world.asUser(user).get('/users/me/envcard/qrcode')).status,
      ).toBe(404);
      expect((await update(user, 9, 15)).status).toBe(201);
      expect(datesOf(await onlineCard(user))).toEqual({
        start_date: '2027-03-10T00:00:00.000Z',
        end_date: '2032-03-09T00:00:00.000Z',
      });
    });
  });
});
