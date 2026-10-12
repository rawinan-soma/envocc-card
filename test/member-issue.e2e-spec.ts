import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

describe('Step 7: creating the card record (POST admins/members)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const passStep7 = (userId: number) =>
    world
      .asAdmin(ADMIN.MINISTRY)
      .post('/admins/members')
      .send({ userId, signature_method: 7 });

  const membersOf = (userId: number) =>
    world.prisma.members.findMany({ where: { userId } });

  it('gives a first-time user the next Member Number', async () => {
    const other = await world.createUser({ history: [0, 1, 3, 4, 7, 8] });
    await world.giveMember(other, { member_no: 41, qrcode: '00000041' });
    const user = await world.createUser({ history: [0, 1, 3, 4] });

    const res = await passStep7(user);

    expect(res.status).toBe(201);
    expect(await membersOf(user)).toEqual([
      expect.objectContaining({ member_no: 42 }),
    ]);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4, 7]);
  });

  it('keeps one card record with the original Member Number and QR code when passed a second time', async () => {
    const user = await world.createUser({
      history: [0, 1, 3, 4, 7, 8, 9, 6],
    });
    await world.giveMember(user, {
      member_no: 5,
      qrcode: '12345678',
      start_date: undefined,
      end_date: undefined,
    });

    const res = await passStep7(user);

    expect(res.status).toBe(201);
    expect(await membersOf(user)).toEqual([
      expect.objectContaining({
        member_no: 5,
        qrcode: '12345678',
        qrcode_pass: 'secret',
      }),
    ]);
  });
});
