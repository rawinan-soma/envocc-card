import {
  ADMIN,
  ORG,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const ISSUED = [0, 1, 4, 7, 8, 9, 15];
const LOST = 3;
const EXPIRED = 2;
const BAD_TYPE =
  'request_type must be one of the following values: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11';

interface Row {
  id: number;
  request_status: number | null;
  request_type: number | null;
  request_type_name: string | null;
}

interface Page {
  data: Row[];
  pageData: { totalItems: number; totalPages: number; currentPage: number };
}

describe('Admins see and filter users by Request Type', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  let later = Date.parse('2026-06-01T00:00:00Z');

  // A card holder who has started a request for a new card of `type` and
  // moved through `statuses` of it.
  const holderWithRequest = async (
    type: number,
    statuses: number[],
    orgId: number = ORG.UNIT,
  ) => {
    const userId = await world.createUser({ history: ISSUED, orgId });
    for (const status of statuses) {
      await world.prisma.requests.create({
        data: {
          userId,
          request_status: status,
          request_type: type,
          date_update: new Date((later += 60_000)),
        },
      });
    }
    return userId;
  };

  // An entry from before Request Types were checked: the foreign key is NOT
  // VALID in production, so such a type may have no request_types row.
  const legacyEntry = (userId: number, requestType: number) =>
    world.prisma.$transaction([
      world.prisma.$executeRaw`SET LOCAL session_replication_role = replica`,
      world.prisma
        .$executeRaw`INSERT INTO requests ("userId", request_status, request_type, date_update)
        VALUES (${userId}, 4, ${requestType}, ${new Date((later += 60_000))})`,
    ]);

  const list = async (adminId: number, path: string) => {
    const res = await world.asAdmin(adminId).get(path);
    expect(res.status).toBe(200);
    return res.body as Page;
  };

  const lists = [
    ['GET admins/users', ADMIN.UNIT, '/admins/users?status=ongoing&'],
    ['GET admins/users/all', ADMIN.MINISTRY, '/admins/users/all?'],
  ] as const;

  describe.each(lists)('%s', (_, adminId, base) => {
    it("gives each row the Request Type id and name of the user's latest entry", async () => {
      const firstCard = await world.createUser({ history: [0, 1] });
      const lost = await holderWithRequest(LOST, [1, 4]);

      const page = await list(adminId, base);

      expect(page.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: firstCard,
            request_type: 1,
            request_type_name: 'ครั้งแรก',
          }),
          expect.objectContaining({
            id: lost,
            request_type: LOST,
            request_type_name: 'บัตรสูญหาย',
          }),
        ]),
      );
    });

    it('returns only users whose latest entry has the filtered Request Type', async () => {
      await world.createUser({ history: [0, 1] });
      const lost = await holderWithRequest(LOST, [1]);
      const expiredAfterLost = await holderWithRequest(LOST, [1, 4]);
      await world.prisma.requests.create({
        data: {
          userId: expiredAfterLost,
          request_status: 1,
          request_type: EXPIRED,
          date_update: new Date((later += 60_000)),
        },
      });

      const page = await list(adminId, `${base}request_type=${LOST}`);

      expect(page.data.map((r) => r.id)).toEqual([lost]);
      expect(page.pageData).toMatchObject({ totalItems: 1, totalPages: 1 });
    });

    it('combines the filter with search and paging, counting only the filtered users', async () => {
      const lost: number[] = [];
      for (let i = 0; i < 12; i++) {
        lost.push(await holderWithRequest(LOST, [1]));
      }
      for (let i = 0; i < 3; i++) {
        await holderWithRequest(EXPIRED, [1]);
      }
      await world.prisma.users.updateMany({
        where: { id: { in: [lost[0], lost[5]] } },
        data: { fname_th: 'สมชาย' },
      });

      const page2 = await list(adminId, `${base}request_type=${LOST}&page=2`);
      const searched = await list(
        adminId,
        `${base}request_type=${LOST}&search_term=สมชาย`,
      );

      expect(page2.data.map((r) => r.id)).toEqual(lost.slice(10));
      expect(page2.pageData).toMatchObject({
        totalItems: 12,
        totalPages: 2,
        currentPage: 2,
      });
      expect(searched.data.map((r) => r.id)).toEqual([lost[0], lost[5]]);
      expect(searched.pageData).toMatchObject({ totalItems: 2 });
    });

    it.each(['99', '0', 'lost'])(
      'refuses request_type=%s with 400',
      async (value) => {
        const res = await world
          .asAdmin(adminId)
          .get(`${base}request_type=${value}`);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ message: [BAD_TYPE] });
      },
    );

    it('lists a user whose latest entry has a type no Request Type matches, with no type name', async () => {
      const firstCard = await world.createUser({ history: [0, 1] });
      const legacy = await world.createUser({ history: [0, 1] });
      await legacyEntry(legacy, 99);

      const page = await list(adminId, base);

      expect(page.data).toEqual([
        expect.objectContaining({ id: firstCard, request_type: 1 }),
        expect.objectContaining({
          id: legacy,
          request_status: 4,
          request_type: 99,
          request_type_name: null,
        }),
      ]);
    });

    it('lists users of every Request Type without the filter', async () => {
      const firstCard = await world.createUser({ history: [0, 1] });
      const lost = await holderWithRequest(LOST, [1]);
      const expired = await holderWithRequest(EXPIRED, [4]);

      const page = await list(adminId, base);

      expect(page.data.map((r) => r.id)).toEqual([firstCard, lost, expired]);
      expect(page.pageData).toMatchObject({ totalItems: 3 });
    });
  });

  it('combines the filter with the status filter on the latest entry', async () => {
    const ongoing = await holderWithRequest(LOST, [1]);
    await holderWithRequest(LOST, [1, 4, 7, 8, 9, 15]);
    await holderWithRequest(EXPIRED, [1]);

    const page = await list(
      ADMIN.UNIT,
      `/admins/users?status=ongoing&request_type=${LOST}`,
    );
    const issued = await list(
      ADMIN.UNIT,
      `/admins/users?status=activated&request_type=${LOST}`,
    );

    expect(page.data.map((r) => r.id)).toEqual([ongoing]);
    expect(issued.data).toHaveLength(1);
    expect(issued.data[0]).toMatchObject({
      request_status: 15,
      request_type: LOST,
    });
  });

  it("keeps an admin's filtered list to their own organization and below", async () => {
    const inScope = await holderWithRequest(LOST, [1], ORG.UNIT);
    await holderWithRequest(LOST, [1], ORG.OTHER_DEPARTMENT);

    const page = await list(
      ADMIN.DEPARTMENT,
      `/admins/users?status=ongoing&request_type=${LOST}`,
    );

    expect(page.data.map((r) => r.id)).toEqual([inScope]);
    expect(page.pageData).toMatchObject({ totalItems: 1 });
  });

  it('gives no type name in the single-user view for a type no Request Type matches', async () => {
    const legacy = await world.createUser({ history: [0, 1] });
    await legacyEntry(legacy, 99);

    const res = await world
      .asAdmin(ADMIN.UNIT)
      .get(`/admins/users/${legacy}/requests/form`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: legacy,
      request_type: 99,
      request_type_name: null,
    });
  });

  it("gives the Request Type of the user's latest entry in the admin's single-user view", async () => {
    const lost = await holderWithRequest(LOST, [1, 4]);

    const res = await world
      .asAdmin(ADMIN.UNIT)
      .get(`/admins/users/${lost}/requests/form`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: lost,
      request_type: LOST,
      request_type_name: 'บัตรสูญหาย',
    });
    expect(res.body).not.toHaveProperty('requests');
  });
});
