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

  const memberNoOf = async (userId: number) =>
    (await membersOf(userId)).map((member) => member.member_no)[0];

  it('gives a first-time user the next Member Number', async () => {
    const first = await world.createUser({ history: [0, 1, 4] });
    const user = await world.createUser({ history: [0, 1, 4] });
    expect((await passStep7(first)).status).toBe(201);

    const res = await passStep7(user);

    expect(res.status).toBe(201);
    expect(await memberNoOf(user)).toBe((await memberNoOf(first))! + 1);
    expect(await world.historyOf(user)).toEqual([0, 1, 4, 7]);
  });

  it("never gives a deleted user's Member Number to anyone else", async () => {
    const first = await world.createUser({ history: [0, 1, 4] });
    const deleted = await world.createUser({ history: [0, 1, 4] });
    const user = await world.createUser({ history: [0, 1, 4] });
    await passStep7(first);
    await passStep7(deleted);
    const deletedNo = await memberNoOf(deleted);
    expect(
      (await world.asAdmin(ADMIN.MINISTRY).delete(`/admins/users/${deleted}`))
        .status,
    ).toBe(200);

    expect((await passStep7(user)).status).toBe(201);

    expect(await memberNoOf(user)).toBe(deletedNo! + 1);
  });

  it('gives different Member Numbers to users whose cards are created at the same time', async () => {
    const users: number[] = [];
    for (let i = 0; i < 10; i++) {
      users.push(await world.createUser({ history: [0, 1, 4] }));
    }

    const responses = await Promise.all(users.map((user) => passStep7(user)));

    expect(responses.map((res) => res.status)).toEqual(users.map(() => 201));
    const numbers = (await world.prisma.members.findMany()).map(
      (member) => member.member_no,
    );
    expect(numbers).toHaveLength(10);
    expect(new Set(numbers).size).toBe(10);
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
