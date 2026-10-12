import { existsSync } from 'fs';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const ISSUED = [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 15];

describe('Revert (POST admins/users/:userId/requests/revert)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const revert = (
    userId: number,
    body: object,
    adminId: number = ADMIN.MINISTRY,
  ) =>
    world
      .asAdmin(adminId)
      .post(`/admins/users/${userId}/requests/revert`)
      .send(body);

  describe('who can revert', () => {
    it.each([
      ['PROVINCE', ADMIN.PROVINCE],
      ['UNIT', ADMIN.UNIT],
    ])('rejects a %s admin with 403', async (_, adminId) => {
      const user = await world.createUser({ history: [...ISSUED, 16] });

      const res = await revert(
        user,
        { current_status: 16, target_status: 15 },
        adminId,
      );

      expect(res.status).toBe(403);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 16]);
    });

    it('rejects a DEPARTMENT admin reverting a user outside their organization with 403', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });

      const res = await revert(
        user,
        { current_status: 16, target_status: 15 },
        ADMIN.OTHER_DEPARTMENT,
      );

      expect(res.status).toBe(403);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 16]);
    });

    it('lets a DEPARTMENT admin revert a user in an organization below theirs', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });

      const res = await revert(
        user,
        { current_status: 16, target_status: 15 },
        ADMIN.DEPARTMENT,
      );

      expect(res.status).toBe(201);
    });
  });

  describe('moves that are not Reverts', () => {
    it.each([
      [15, 7],
      [15, 1],
      [3, 6],
      [7, 0],
      [16, 1],
      [4, 3],
    ])('rejects %i → %i with 400 and changes nothing', async (from, to) => {
      const history = [...ISSUED.filter((s) => s < from), from];
      const user = await world.createUser({ history });

      const res = await revert(user, {
        current_status: from,
        target_status: to,
      });

      expect(res.status).toBe(400);
      expect(await world.historyOf(user)).toEqual(history);
    });

    it('rejects a mismatched current_status with 400 and changes nothing', async () => {
      const user = await world.createUser({ history: [0, 1, 3, 4] });
      const photo = await world.giveFile(user, 'photo');

      const res = await revert(user, { current_status: 3, target_status: 0 });

      expect(res.status).toBe(400);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
      expect(await world.filesOf(user, 'photo')).toEqual([{ url: photo }]);
    });
  });

  const memberOf = (userId: number) =>
    world.prisma.members.findMany({ where: { userId } });

  describe('→ 0', () => {
    it.each([1, 4, 6])(
      'from %i resets the user to unapproved with no Status History or uploads, keeping their profile and experiences',
      async (from) => {
        const history = [0, 1, 3, 4, 5, 6].filter((s) => s < from);
        const user = await world.createUser({ history: [...history, from] });
        const files = await Promise.all(
          (['photo', 'govcard', 'expfile', 'reqFile'] as const).map((kind) =>
            world.giveFile(user, kind),
          ),
        );
        await world.prisma.experiences.create({
          data: { userId: user, exp_office: 'hospital' },
        });

        const profile = await world.prisma.users.findFirstOrThrow({
          where: { id: user },
          select: { cid: true, fname_th: true, fname_en: true, email: true },
        });

        const res = await revert(user, {
          current_status: from,
          target_status: 0,
        });

        expect(res.status).toBe(201);
        expect(await world.historyOf(user)).toEqual([0]);
        const after = await world.prisma.users.findFirst({
          where: { id: user },
          include: { experiences: true },
        });
        expect(after).toMatchObject({
          ...profile,
          is_validate: false,
          experiences: [expect.objectContaining({ exp_office: 'hospital' })],
        });
        for (const kind of [
          'photo',
          'govcard',
          'expfile',
          'reqFile',
        ] as const) {
          expect(await world.filesOf(user, kind)).toEqual([]);
        }
        for (const file of files) {
          expect(existsSync(file)).toBe(false);
        }
      },
    );

    it('leaves the user ready to be approved again', async () => {
      const user = await world.createUser({ history: [0, 1, 3, 4] });
      await revert(user, { current_status: 4, target_status: 0 });

      const res = await world
        .asAdmin(ADMIN.UNIT)
        .patch(`/admins/users/validate/${user}`);

      expect(res.status).toBe(200);
      expect(await world.historyOf(user)).toEqual([0, 1]);
    });
  });

  describe.each([
    [1, 2],
    [1, 14],
    [6, 7],
    [6, 14],
  ])('%i ← %i', (target, from) => {
    const history = [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14].filter(
      (s) => s < from,
    );

    it('deletes only the files in delete_files, and keeps the card record with cleared dates', async () => {
      const user = await world.createUser({ history: [...history, from] });
      const photo = await world.giveFile(user, 'photo');
      const govcard = await world.giveFile(user, 'govcard');
      const expfile = await world.giveFile(user, 'expfile');
      await world.giveMember(user, { member_no: 4, qrcode: '44445555' });

      const res = await revert(user, {
        current_status: from,
        target_status: target,
        delete_files: ['photo'],
      });

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...history, from, target]);
      expect(await world.filesOf(user, 'photo')).toEqual([]);
      expect(existsSync(photo)).toBe(false);
      expect(await world.filesOf(user, 'govcard')).toEqual([{ url: govcard }]);
      expect(await world.filesOf(user, 'expfile')).toEqual([{ url: expfile }]);
      expect(existsSync(govcard)).toBe(true);
      expect(await memberOf(user)).toEqual([
        expect.objectContaining({
          member_no: 4,
          qrcode: '44445555',
          start_date: null,
          end_date: null,
        }),
      ]);
    });

    it('keeps every file when delete_files is missing', async () => {
      const user = await world.createUser({ history: [...history, from] });
      const photo = await world.giveFile(user, 'photo');

      const res = await revert(user, {
        current_status: from,
        target_status: target,
      });

      expect(res.status).toBe(201);
      expect(await world.filesOf(user, 'photo')).toEqual([{ url: photo }]);
      expect(existsSync(photo)).toBe(true);
    });
  });

  it('rejects an unknown delete_files entry with 400', async () => {
    const user = await world.createUser({ history: [0, 1, 3, 4] });

    const res = await revert(user, {
      current_status: 4,
      target_status: 1,
      delete_files: ['envcard'],
    });

    expect(res.status).toBe(400);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
  });

  describe('→ 7', () => {
    it.each([8, 14])(
      'from %i keeps the card record with its Member Number and QR code, and clears its dates',
      async (from) => {
        const history = [0, 1, 3, 4, 7, from];
        const user = await world.createUser({ history });
        await world.giveMember(user, { member_no: 9, qrcode: '99990000' });

        const res = await revert(user, {
          current_status: from,
          target_status: 7,
        });

        expect(res.status).toBe(201);
        expect(await world.historyOf(user)).toEqual([...history, 7]);
        expect(await memberOf(user)).toEqual([
          expect.objectContaining({
            member_no: 9,
            qrcode: '99990000',
            start_date: null,
            end_date: null,
          }),
        ]);
      },
    );
  });

  describe('when a step fails', () => {
    // Makes the database reject the Revert's new Status History entry, the
    // last step, after everything else in the Revert has run.
    const failInsertsOfStatus = async (status: number) => {
      await world.prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION fail_insert() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'injected failure'; END $$ LANGUAGE plpgsql`);
      await world.prisma.$executeRawUnsafe(`
        CREATE TRIGGER fail_insert BEFORE INSERT ON requests
        FOR EACH ROW WHEN (NEW.request_status = ${status})
        EXECUTE FUNCTION fail_insert()`);
    };
    afterEach(() =>
      world.prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_insert ON requests',
      ),
    );

    it('leaves a Revert to 0 with no rows or files changed', async () => {
      const user = await world.createUser({ history: [0, 1, 3, 4] });
      const photo = await world.giveFile(user, 'photo');
      const reqFile = await world.giveFile(user, 'reqFile');
      await failInsertsOfStatus(0);

      const res = await revert(user, { current_status: 4, target_status: 0 });

      expect(res.status).toBe(500);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
      expect(
        await world.prisma.users.findFirst({ where: { id: user } }),
      ).toMatchObject({ is_validate: true });
      expect(await world.filesOf(user, 'photo')).toEqual([{ url: photo }]);
      expect(await world.filesOf(user, 'reqFile')).toEqual([{ url: reqFile }]);
      expect(existsSync(photo)).toBe(true);
      expect(existsSync(reqFile)).toBe(true);
    });

    it('leaves a Revert to 1 with no rows or files changed', async () => {
      const user = await world.createUser({ history: [0, 1, 3, 4, 7, 8] });
      const photo = await world.giveFile(user, 'photo');
      await world.giveMember(user, { member_no: 2, qrcode: '22223333' });
      await failInsertsOfStatus(1);

      const res = await revert(user, {
        current_status: 8,
        target_status: 1,
        delete_files: ['photo'],
      });

      expect(res.status).toBe(500);
      expect(await world.historyOf(user)).toEqual([0, 1, 3, 4, 7, 8]);
      expect(await world.filesOf(user, 'photo')).toEqual([{ url: photo }]);
      expect(existsSync(photo)).toBe(true);
      expect(await memberOf(user)).toEqual([
        expect.objectContaining({ start_date: new Date('2026-02-01') }),
      ]);
    });
  });

  describe('16 → 15', () => {
    it('un-cancels the card so it verifies again', async () => {
      const user = await world.createUser({ history: [...ISSUED, 16] });
      await world.giveMember(user, {
        member_no: 3,
        qrcode: '33334444',
        is_active: false,
      });

      const res = await revert(user, {
        current_status: 16,
        target_status: 15,
        description: 'cancelled by mistake',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        userId: user,
        request_status: 15,
        approver: ADMIN.MINISTRY,
        description: 'cancelled by mistake',
      });
      expect(await world.historyOf(user)).toEqual([...ISSUED, 16, 15]);
      expect(
        await world.prisma.members.findFirst({ where: { userId: user } }),
      ).toMatchObject({ is_active: true });
      const qr = await world
        .anonymous()
        .get('/common/qrcode?qrcode_number=33334444');
      expect(qr.status).toBe(200);
    });
  });
});
