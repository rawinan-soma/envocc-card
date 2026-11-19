import { existsSync } from 'fs';
import {
  ADMIN,
  ORG,
  CardRequestWorld,
  createCardRequestWorld,
  FileKind,
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
          .attach('photo', Buffer.from('fake'), 'me.jpg')
          .attach('policeReport', Buffer.from('fake'), 'policeReport.pdf'),
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

  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10])(
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

  it('works out the years of each experience sent along', async () => {
    const user = await world.createUser({ history: ISSUED });

    expect((await startRequest(user, 5)).status).toBe(201);

    expect(
      await world.prisma.experiences.findMany({ where: { userId: user } }),
    ).toEqual([expect.objectContaining({ exp_years: 3 })]);
  });

  it('never saves a password sent along', async () => {
    const user = await world.createUser({ history: ISSUED });

    const res = await startRequest(user, 5, {
      user: { password: 'NewPassword@123' },
    });

    expect(res.status).toBe(201);
    expect(
      (await world.prisma.users.findUniqueOrThrow({ where: { id: user } }))
        .password,
    ).toBe('x');
  });

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

  it('carries type 3 on every entry from 1 to 15, and keeps the Member Number and QR code', async () => {
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
      await world.prisma.members.findMany({
        where: { userId: user },
        orderBy: { member_id: 'asc' },
      }),
    ).toEqual([
      expect.objectContaining({ member_no: 5, qrcode: '55556666' }),
      expect.objectContaining({
        member_no: 5,
        qrcode: '55556666',
        start_date: new Date('2027-03-01'),
      }),
    ]);
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
    world.setToday('2027-03-01');

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

  describe('a change of organization (type 11)', () => {
    const cardsOf = (userId: number) =>
      world.prisma.members.findMany({
        where: { userId },
        orderBy: { member_id: 'asc' },
      });

    it('refuses to start from 15 with 403, saving nothing', async () => {
      const user = await world.createUser({ history: ISSUED });
      const before = await detailsOf(user);

      const res = await startRequest(user, 11);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        message: 'a new card can be requested only at request status 16',
      });
      expect(await world.historyOf(user)).toEqual(ISSUED);
      expect(await detailsOf(user)).toEqual(before);
    });

    it('starts from 16 at status 1', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });

      const res = await startRequest(user, 11);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 16, 1]);
      expect((await entriesOf(user)).at(-1)).toMatchObject({
        request_status: 1,
        request_type: 11,
      });
    });

    it('moves the user to their new organization, whose admins then see them', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });
      const ongoing = async (adminId: number) =>
        (
          (
            await world
              .asAdmin(adminId)
              .get('/admins/users?status=ongoing&page=1')
          ).body as { data: { id: number }[] }
        ).data.map((row) => row.id);

      const res = await startRequest(user, 11, {
        user: { orgId: ORG.OTHER_DEPARTMENT },
      });

      expect(res.status).toBe(201);
      expect(
        (await world.prisma.users.findUniqueOrThrow({ where: { id: user } }))
          .organizationId,
      ).toBe(ORG.OTHER_DEPARTMENT);
      expect(await ongoing(ADMIN.OTHER_DEPARTMENT)).toEqual([user]);
      expect(await ongoing(ADMIN.DEPARTMENT)).toEqual([]);
    });

    it('refuses an organization that does not exist with 400, saving nothing', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });

      const res = await startRequest(user, 11, { user: { orgId: 999 } });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'organization not found' });
      expect(await world.historyOf(user)).toEqual([...ISSUED, 16]);
      expect(
        (await world.prisma.users.findUniqueOrThrow({ where: { id: user } }))
          .organizationId,
      ).toBe(ORG.UNIT);
    });

    it('lets a Ministry admin cancel the card of a user in an organization below theirs, so the user can start it', async () => {
      const user = await world.createUser({ history: ISSUED });
      await world.giveMember(user, { qrcode: '12341234' });
      const admin = world.asAdmin(ADMIN.MINISTRY);

      const moved = await admin.post('/admins/users/requests/update').send({
        user,
        current_status: 15,
        next_status: 16,
        request_type: 1,
        description: 'ย้ายสังกัด',
      });
      const deactivated = await admin.patch(
        `/admins/members/${user}/deactivate`,
      );

      expect(moved.status).toBe(201);
      expect(deactivated.status).toBe(200);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 16]);
      expect(await cardsOf(user)).toEqual([
        expect.objectContaining({ is_active: false }),
      ]);
      expect((await startRequest(user, 11)).status).toBe(201);
    });

    // Every card given here takes its number from the sequence, as in the app.
    const numbersInUse = async () => {
      const other = await world.createUser({ history: ISSUED });
      await world.giveMember(other, { qrcode: '20002000' });
      const deleted = await world.createUser({ history: ISSUED });
      await world.giveMember(deleted, { qrcode: '30003000' });
      const held = (await world.prisma.members.findMany()).map(
        (c) => c.member_no,
      );
      await world.prisma.users.delete({ where: { id: deleted } });
      return held;
    };

    it('issues a card with a Member Number not used before, keeping the QR code', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });
      const oldCard = await world.giveMember(user, {
        qrcode: '10001000',
        is_active: false,
      });
      const used = await numbersInUse();

      expect((await startRequest(user, 11)).status).toBe(201);
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
      const [old, issued] = await cardsOf(user);
      expect(old).toMatchObject({
        member_no: oldCard.member_no,
        is_active: false,
      });
      expect(issued).toMatchObject({ qrcode: '10001000', is_active: true });
      expect(issued.member_no).toEqual(expect.any(Number));
      expect(used).not.toContain(issued.member_no);
      const printed = await world
        .asAdmin(ADMIN.MINISTRY)
        .get(`/admins/members/${user}`);
      expect(printed.body).toMatchObject({ member_no: issued.member_no });
    });

    it.each([3, 4, 5, 6, 7, 8, 9, 10])(
      "issues a type %i card with the Old card's Member Number",
      async (requestType) => {
        const user = await world.createUser({ history: [...ISSUED, 16] });
        const oldCard = await world.giveMember(user, {
          qrcode: '10001000',
          is_active: false,
        });
        await numbersInUse();

        expect((await startRequest(user, requestType)).status).toBe(201);
        await walkToIssued(user);

        expect(await cardsOf(user)).toEqual([
          expect.objectContaining({ member_no: oldCard.member_no }),
          expect.objectContaining({
            member_no: oldCard.member_no,
            is_active: true,
          }),
        ]);
      },
    );
  });

  describe('the files sent for the earlier request', () => {
    const KINDS: FileKind[] = [
      'photo',
      'govcard',
      'policeReport',
      'expfile',
      'envcard',
    ];

    // A card holder with every file of their first request and one experience.
    const cardHolder = async (history = ISSUED) => {
      const user = await world.createUser({ history });
      const paths = {} as Record<FileKind, string>;
      for (const kind of KINDS) {
        paths[kind] = await world.giveFile(user, kind);
      }
      await world.prisma.experiences.create({
        data: { userId: user, exp_office: 'สำนักงานเดิม' },
      });
      return { user, paths };
    };

    const storedOf = async (user: number) => {
      const stored: Partial<Record<FileKind, string[]>> = {};
      for (const kind of KINDS) {
        stored[kind] = (await world.filesOf(user, kind)).map((f) => f.url);
      }
      return stored;
    };

    const uploadAsUser = (user: number, fields: ('govCard' | 'photo')[]) => {
      let req = world.asUser(user).post('/users/me/files');
      for (const field of fields) {
        req = req.attach(
          field,
          Buffer.from('fake'),
          field === 'photo' ? 'me.jpg' : 'govCard.pdf',
        );
      }
      return req;
    };

    it.each([3, 4, 5, 6, 7, 8, 9, 10, 11])(
      'deletes the photo, government card and police report when a type %i request starts, and keeps the rest',
      async (requestType) => {
        const { user, paths } = await cardHolder([...ISSUED, 16]);

        expect((await startRequest(user, requestType, {})).status).toBe(201);

        expect(await storedOf(user)).toEqual({
          photo: [],
          govcard: [],
          policeReport: [],
          expfile: [paths.expfile],
          envcard: [paths.envcard],
        });
        expect(existsSync(paths.photo)).toBe(false);
        expect(existsSync(paths.govcard)).toBe(false);
        expect(existsSync(paths.policeReport)).toBe(false);
        expect(existsSync(paths.expfile)).toBe(true);
        expect(existsSync(paths.envcard)).toBe(true);
        expect(
          await world.prisma.experiences.findMany({ where: { userId: user } }),
        ).toEqual([expect.objectContaining({ exp_office: 'สำนักงานเดิม' })]);
      },
    );

    it('deletes the government card and police report when a type 2 request starts, keeping the photo', async () => {
      const { user, paths } = await cardHolder();

      expect((await startRequest(user, 2, {})).status).toBe(201);

      expect(await storedOf(user)).toEqual({
        photo: [paths.photo],
        govcard: [],
        policeReport: [],
        expfile: [paths.expfile],
        envcard: [paths.envcard],
      });
      expect(existsSync(paths.photo)).toBe(true);
      expect(existsSync(paths.govcard)).toBe(false);
      expect(existsSync(paths.policeReport)).toBe(false);
    });

    it('deletes the files of a user starting from a cancelled card (16) too', async () => {
      const { user, paths } = await cardHolder([...ISSUED, 16]);

      expect((await startRequest(user, 4, {})).status).toBe(201);

      expect(await storedOf(user)).toMatchObject({ photo: [], govcard: [] });
      expect(existsSync(paths.photo)).toBe(false);
      expect(existsSync(paths.govcard)).toBe(false);
    });

    it.each([
      ['at a status it cannot start from', [...ISSUED, 1], 3, 403],
      ['with a Request Type a user cannot pick', ISSUED, 1, 400],
    ])('deletes no file when refused %s', async (_, history, type, status) => {
      const { user, paths } = await cardHolder(history);

      expect((await startRequest(user, type, {})).status).toBe(status);

      expect(await storedOf(user)).toEqual({
        photo: [paths.photo],
        govcard: [paths.govcard],
        policeReport: [paths.policeReport],
        expfile: [paths.expfile],
        envcard: [paths.envcard],
      });
      for (const path of Object.values(paths)) {
        expect(existsSync(path)).toBe(true);
      }
    });

    it.each([
      ['a government card', ['photo'], 'govcard is required'],
      ['a photo', ['govCard'], 'photo is required'],
    ] as const)(
      'refuses Document upload for a type 5 request without %s',
      async (_, fields, message) => {
        const { user } = await cardHolder();
        expect((await startRequest(user, 5, {})).status).toBe(201);

        const res = await uploadAsUser(user, [...fields]);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ message });
        expect(await world.historyOf(user)).toEqual([...ISSUED, 1]);
        expect(await storedOf(user)).toMatchObject({ photo: [], govcard: [] });
      },
    );

    it('moves a type 5 request to 4 once a government card and photo are sent', async () => {
      const { user } = await cardHolder();
      expect((await startRequest(user, 5, {})).status).toBe(201);

      const res = await uploadAsUser(user, ['govCard', 'photo']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 1, 4]);
      expect(await storedOf(user)).toMatchObject({
        photo: [expect.any(String)],
        govcard: [expect.any(String)],
      });
    });

    it('moves a type 2 request to 4 with a government card alone, using the kept photo', async () => {
      const { user, paths } = await cardHolder();
      expect((await startRequest(user, 2, {})).status).toBe(201);

      expect((await uploadAsUser(user, ['photo'])).status).toBe(400);
      const res = await uploadAsUser(user, ['govCard']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 1, 4]);
      expect(await storedOf(user)).toMatchObject({ photo: [paths.photo] });
    });
  });

  describe('the copy of the issued card (POST users/me/envcard)', () => {
    // From 1 to 12 by M. print (10) and the approval date (11).
    const walkToCardCopy = async (userId: number) => {
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
        () =>
          admin.post('/admins/members').send({ userId, signature_method: 10 }),
        () => update(10, 11),
        () =>
          admin
            .patch(`/admins/members/${userId}/activate`)
            .send({ startDate: '2027-03-01' }),
      ];
      for (const step of steps) {
        const res = await step();
        expect([200, 201]).toContain(res.status);
      }
      expect((await world.historyOf(userId)).at(-1)).toBe(12);
    };

    const uploadCardCopy = (userId: number) =>
      world
        .asUser(userId)
        .post('/users/me/envcard')
        .attach('envcard', Buffer.from('fake'), 'card.pdf');

    it('replaces the copy of the Old card with the one sent at 12', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });
      await world.giveMember(user, { qrcode: '10001000', is_active: false });
      const oldCopy = await world.giveFile(user, 'envcard');
      expect((await startRequest(user, 4, {})).status).toBe(201);
      await walkToCardCopy(user);

      const res = await uploadCardCopy(user);

      expect(res.status).toBe(201);
      const stored = await world.filesOf(user, 'envcard');
      expect(stored).toHaveLength(1);
      expect(stored[0].url).not.toBe(oldCopy);
      expect(existsSync(stored[0].url)).toBe(true);
      expect(existsSync(oldCopy)).toBe(false);
    });

    it('still refuses a second copy of a first card, keeping the first', async () => {
      const user = await world.createUser({
        history: [0, 1, 4, 7, 10, 11, 12],
      });
      const firstCopy = await world.giveFile(user, 'envcard');

      const res = await uploadCardCopy(user);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'user already has file(s)' });
      expect(await world.filesOf(user, 'envcard')).toEqual([
        { url: firstCopy },
      ]);
      expect(existsSync(firstCopy)).toBe(true);
    });
  });
});
