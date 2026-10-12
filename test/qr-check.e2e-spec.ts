import {
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

const ISSUED = [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 15];

describe('QR check (GET /common/qrcode)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const check = (qrcode: string) =>
    world.anonymous().get(`/common/qrcode?qrcode_number=${qrcode}`);

  it('verifies an issued card', async () => {
    const user = await world.createUser({ history: ISSUED });
    await world.giveMember(user, { member_no: 1, qrcode: '11112222' });

    const res = await check('11112222');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ member_no: 1, qrcode: '11112222' });
  });

  it('verifies a card un-cancelled with 16 → 15', async () => {
    const user = await world.createUser({ history: [...ISSUED, 16, 15] });
    await world.giveMember(user, { member_no: 1, qrcode: '11112222' });

    const res = await check('11112222');

    expect(res.status).toBe(200);
  });

  it('rejects a cancelled card', async () => {
    const user = await world.createUser({ history: [...ISSUED, 16] });
    await world.giveMember(user, { member_no: 1, qrcode: '11112222' });

    const res = await check('11112222');

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
