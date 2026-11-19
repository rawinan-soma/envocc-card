import { addStatusEntry, lockUser } from 'src/request/status-history';
import {
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const REFUSED = 'personal data can be edited only at request status 0, 1 or 6';

const historyAt = (status: number) => (status === 0 ? [0] : [0, status]);
const ALL_STATUSES = Array.from({ length: 17 }, (_, i) => i);
const EDITABLE = [0, 1, 6];
const LOCKED = ALL_STATUSES.filter((s) => !EDITABLE.includes(s));

const NEW_EXPERIENCE = {
  exp_fdate: '2020-01-01',
  exp_ldate: '2023-12-31',
  exp_typeoffice: 1,
  exp_office: 'New office',
  exp_position: 'New position',
  exp_work: 'New work',
};

describe('Edit personal data (PATCH users/me and users/me/experiences)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const fnameOf = async (userId: number) =>
    (await world.prisma.users.findUniqueOrThrow({ where: { id: userId } }))
      .fname_en;

  const giveExperience = async (userId: number) =>
    (
      await world.prisma.experiences.create({
        data: { userId, exp_office: 'Old office', exp_work: 'Old work' },
      })
    ).exp_id;

  const experiencesOf = (userId: number) =>
    world.prisma.experiences.findMany({
      where: { userId },
      orderBy: { exp_id: 'asc' },
    });

  const updateMe = (userId: number) =>
    world.asUser(userId).patch('/users/me').send({ fname_en: 'Changed' });

  const addExperience = (userId: number, body: object[] = [NEW_EXPERIENCE]) =>
    world.asUser(userId).post('/users/me/experiences').send(body);

  const editExperience = (userId: number, expId: number) =>
    world
      .asUser(userId)
      .patch(`/users/me/experiences/${expId}`)
      .send({ exp_work: 'Edited work' });

  const deleteExperience = (userId: number, expId: number) =>
    world.asUser(userId).delete(`/users/me/experiences/${expId}`);

  describe.each(EDITABLE)('at request status %i', (status) => {
    it('saves PATCH users/me', async () => {
      const user = await world.createUser({ history: historyAt(status) });

      const res = await updateMe(user);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ fname_en: 'Changed' });
      expect(await fnameOf(user)).toBe('Changed');
    });

    it('adds, edits and deletes an experience', async () => {
      const user = await world.createUser({ history: historyAt(status) });
      const kept = await giveExperience(user);
      const removed = await giveExperience(user);

      const added = await addExperience(user);
      const edited = await editExperience(user, kept);
      const deleted = await deleteExperience(user, removed);

      expect([added.status, edited.status, deleted.status]).toEqual([
        201, 200, 200,
      ]);
      expect(await experiencesOf(user)).toMatchObject([
        { exp_id: kept, exp_work: 'Edited work' },
        { exp_office: 'New office', exp_years: 3 },
      ]);
    });
  });

  describe.each(LOCKED)('at request status %i', (status) => {
    it('refuses PATCH users/me with 403 and changes nothing', async () => {
      const user = await world.createUser({ history: historyAt(status) });
      const before = await fnameOf(user);

      const res = await updateMe(user);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ message: REFUSED });
      expect(await fnameOf(user)).toBe(before);
    });

    it('refuses adding, editing and deleting an experience with 403', async () => {
      const user = await world.createUser({ history: historyAt(status) });
      const exp = await giveExperience(user);
      const before = await experiencesOf(user);

      const results = [
        await addExperience(user),
        await editExperience(user, exp),
        await deleteExperience(user, exp),
      ];

      expect(results.map((r) => r.status)).toEqual([403, 403, 403]);
      for (const res of results) {
        expect(res.body).toMatchObject({ message: REFUSED });
      }
      expect(await experiencesOf(user)).toEqual(before);
    });
  });

  it.each(ALL_STATUSES)(
    'keeps the read routes open at request status %i',
    async (status) => {
      const user = await world.createUser({ history: historyAt(status) });
      await giveExperience(user);
      const session = world.asUser(user);

      const reads = await Promise.all(
        [
          '/users/me',
          '/users/me/experiences',
          '/users/me/requests/form',
          '/users/me/requests/exp',
        ].map((path) => session.get(path)),
      );

      expect(reads.map((r) => r.status)).toEqual([200, 200, 200, 200]);
      expect(reads[1].body).toMatchObject([{ exp_office: 'Old office' }]);
    },
  );

  it('refuses a user with no status history', async () => {
    const user = await world.createUser({ history: [] });

    const res = await updateMe(user);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: REFUSED });
  });

  describe("another user's experiences", () => {
    it('adds to the logged-in user whatever userId the body names', async () => {
      const me = await world.createUser({ history: [0, 1] });
      const other = await world.createUser({ history: [0, 1, 15] });

      const res = await addExperience(me, [
        { ...NEW_EXPERIENCE, userId: other },
      ]);

      expect(res.status).toBe(201);
      expect(await experiencesOf(me)).toHaveLength(1);
      expect(await experiencesOf(other)).toEqual([]);
    });

    it('cannot be edited or deleted: 404 and left as they were', async () => {
      const me = await world.createUser({ history: [0, 1] });
      const other = await world.createUser({ history: [0, 1, 15] });
      const theirs = await giveExperience(other);
      const before = await experiencesOf(other);

      const edited = await editExperience(me, theirs);
      const deleted = await deleteExperience(me, theirs);

      expect([edited.status, deleted.status]).toEqual([404, 404]);
      expect(edited.body).toMatchObject({ message: 'experience not found' });
      expect(await experiencesOf(other)).toEqual(before);
    });
  });

  describe('a status change already in flight', () => {
    const moveTo4WhileLocked = async (user: number) => {
      let locked!: () => void;
      const lockHeld = new Promise<void>((resolve) => (locked = resolve));
      const move = world.prisma.$transaction(async (tx) => {
        await lockUser(tx, user);
        locked();
        await new Promise((r) => setTimeout(r, 300));
        await addStatusEntry(tx, { userId: user, status: 4, requestType: 1 });
      });
      await lockHeld;
      return { move };
    };

    it('is waited for by PATCH users/me, which then refuses', async () => {
      const user = await world.createUser({ history: [0, 1] });
      const before = await fnameOf(user);

      const { move } = await moveTo4WhileLocked(user);
      const [res] = await Promise.all([updateMe(user), move]);

      expect(res.status).toBe(403);
      expect(await fnameOf(user)).toBe(before);
    });

    it('is waited for by an experience edit, which then refuses', async () => {
      const user = await world.createUser({ history: [0, 1] });
      const exp = await giveExperience(user);
      const before = await experiencesOf(user);

      const { move } = await moveTo4WhileLocked(user);
      const [res] = await Promise.all([editExperience(user, exp), move]);

      expect(res.status).toBe(403);
      expect(await experiencesOf(user)).toEqual(before);
    });
  });
});
