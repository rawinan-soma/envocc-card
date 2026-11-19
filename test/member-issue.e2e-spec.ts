import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const AT_7 = [0, 1, 4, 7];

describe('Step 7: creating the card record (POST admins/members)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const chooseSigningMethod = (userId: number, signature_method: number) =>
    world
      .asAdmin(ADMIN.MINISTRY)
      .post('/admins/members')
      .send({ userId, signature_method });

  const passStep7 = (userId: number) => chooseSigningMethod(userId, 8);

  const membersOf = (userId: number) =>
    world.prisma.members.findMany({ where: { userId } });

  const memberNoOf = async (userId: number) =>
    (await membersOf(userId)).map((member) => member.member_no)[0];

  it('gives a first-time user the next Member Number', async () => {
    const first = await world.createUser({ history: AT_7 });
    const user = await world.createUser({ history: AT_7 });
    expect((await passStep7(first)).status).toBe(201);

    const res = await passStep7(user);

    expect(res.status).toBe(201);
    expect(await memberNoOf(user)).toBe((await memberNoOf(first))! + 1);
    expect(await world.historyOf(user)).toEqual([...AT_7, 8]);
  });

  it.each([
    ['E. sign', 8],
    ['M. sign', 10],
  ])(
    'moves a user at 7 on to the first status of %s, %i',
    async (_, signatureMethod) => {
      const user = await world.createUser({ history: AT_7 });

      const res = await chooseSigningMethod(user, signatureMethod);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...AT_7, signatureMethod]);
    },
  );

  it.each([3, 7, 9, 11, 15, 16])(
    'refuses signature_method %i with 400, creating no card record',
    async (signatureMethod) => {
      const user = await world.createUser({ history: AT_7 });

      const res = await chooseSigningMethod(user, signatureMethod);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: 'signature_method must be 8 or 10',
      });
      expect(await world.historyOf(user)).toEqual(AT_7);
      expect(await membersOf(user)).toEqual([]);
    },
  );

  it.each([
    [4, [0, 1, 4]],
    [8, [...AT_7, 8]],
    [15, [...AT_7, 8, 9, 15]],
  ])(
    'refuses the signing method at request status %i with 400',
    async (_, history) => {
      const user = await world.createUser({ history });

      const res = await chooseSigningMethod(user, 8);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        message: 'the signing method can be chosen only at request status 7',
      });
      expect(await world.historyOf(user)).toEqual(history);
    },
  );

  it("never gives a deleted user's Member Number to anyone else", async () => {
    const first = await world.createUser({ history: AT_7 });
    const deleted = await world.createUser({ history: AT_7 });
    const user = await world.createUser({ history: AT_7 });
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
      users.push(await world.createUser({ history: AT_7 }));
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
      history: [...AT_7, 8, 9, 7],
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
