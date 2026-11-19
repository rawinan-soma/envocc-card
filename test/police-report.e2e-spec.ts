import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

type Field = 'govCard' | 'photo' | 'policeReport';

const fileNameOf = (field: Field) =>
  field === 'photo' ? 'me.jpg' : `${field}.pdf`;

const ISSUED = [0, 1, 4, 7, 8, 9, 15];

describe('The police report of a lost-card request (Request Type 3)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const attach = (
    req: ReturnType<ReturnType<CardRequestWorld['asUser']>['post']>,
    fields: Field[],
  ) => {
    for (const field of fields) {
      req = req.attach(field, Buffer.from('fake'), fileNameOf(field));
    }
    return req;
  };

  const uploadAsUser = (user: number, fields: Field[]) =>
    attach(world.asUser(user).post('/users/me/files'), fields);

  const uploadAsAdmin = (user: number, fields: Field[]) =>
    attach(
      world.asAdmin(ADMIN.UNIT).post(`/admins/users/${user}/files`),
      fields,
    );

  // A user at 1 of a request of `requestType`, with a photo stored.
  const atUpload = async (requestType: number, orgId?: number) => {
    const user = await world.createUser({
      orgId,
      history: [...ISSUED, 1],
      requestType,
    });
    await world.giveFile(user, 'photo');
    return user;
  };

  const assets = () => readdirSync(join(world.workDir(), 'assets'));

  describe('Document upload', () => {
    it.each([
      ['the user', uploadAsUser],
      ['an admin', uploadAsAdmin],
    ])(
      'by %s is refused for type 3 without a police report, storing nothing',
      async (_, upload) => {
        const user = await atUpload(3);
        const before = assets();

        const res = await upload(user, ['govCard']);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ message: 'policeReport is required' });
        expect(await world.historyOf(user)).toEqual([...ISSUED, 1]);
        expect(await world.filesOf(user, 'govcard')).toEqual([]);
        expect(assets()).toEqual(before);
      },
    );

    it.each([
      ['the user', uploadAsUser, null],
      ['an admin', uploadAsAdmin, ADMIN.UNIT],
    ])(
      'by %s moves type 3 to 4 with a police report, and stores it',
      async (_, upload, adminId) => {
        const user = await atUpload(3);

        const res = await upload(user, ['govCard', 'policeReport']);

        expect(res.status).toBe(201);
        expect(await world.historyOf(user)).toEqual([...ISSUED, 1, 4]);
        const stored = await world.prisma.police_report_files.findMany({
          where: { userId: user },
        });
        expect(stored).toEqual([expect.objectContaining({ adminId })]);
        expect(existsSync(stored[0].url!)).toBe(true);
      },
    );

    it('moves type 3 to 4 with the police report already stored', async () => {
      const user = await atUpload(3);
      const kept = await world.giveFile(user, 'policeReport');

      const res = await uploadAsUser(user, ['govCard']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([...ISSUED, 1, 4]);
      expect(await world.filesOf(user, 'policeReport')).toEqual([
        { url: kept },
      ]);
    });

    it('replaces a stored police report with the one sent', async () => {
      const user = await atUpload(3);
      const old = await world.giveFile(user, 'policeReport');

      const res = await uploadAsUser(user, ['govCard', 'policeReport']);

      expect(res.status).toBe(201);
      const stored = await world.filesOf(user, 'policeReport');
      expect(stored).toHaveLength(1);
      expect(stored[0].url).not.toBe(old);
      expect(existsSync(old)).toBe(false);
    });

    it.each([2, 4, 5, 6, 7, 8, 9, 10, 11])(
      'does not need a police report for type %i',
      async (requestType) => {
        const user = await atUpload(requestType);

        const res = await uploadAsUser(user, ['govCard']);

        expect(res.status).toBe(201);
        expect(await world.historyOf(user)).toEqual([...ISSUED, 1, 4]);
      },
    );

    it('does not need a police report for a first-card request', async () => {
      const user = await world.createUser({ history: [0, 1] });

      const res = await uploadAsUser(user, ['govCard']);

      expect(res.status).toBe(201);
      expect(await world.historyOf(user)).toEqual([0, 1, 4]);
    });

    it('refuses a police report that is not a PDF, storing nothing', async () => {
      const user = await atUpload(3);

      const res = await world
        .asUser(user)
        .post('/users/me/files')
        .attach('govCard', Buffer.from('fake'), 'govCard.pdf')
        .attach('policeReport', Buffer.from('fake'), 'policeReport.jpg');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'unsupported file type' });
      expect(await world.historyOf(user)).toEqual([...ISSUED, 1]);
    });
  });

  it('lets the user read their own police report (GET users/me/files/policeReport)', async () => {
    const user = await atUpload(3);
    const url = await world.giveFile(user, 'policeReport');

    const res = await world.asUser(user).get('/users/me/files/policeReport');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ url });
  });
});
