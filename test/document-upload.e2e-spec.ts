import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

type Field = 'govCard' | 'requestFile' | 'experienceForm';

describe('Step 3: uploading documents (POST users/me/files)', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const upload = (userId: number, fields: Field[]) => {
    let req = world
      .asAdmin(ADMIN.UNIT)
      .post('/users/me/files')
      .field('user', String(userId));
    for (const field of fields) {
      req = req.attach(field, Buffer.from('fake'), `${field}.pdf`);
    }
    return req;
  };

  const assets = () => readdirSync(join(world.workDir(), 'assets'));

  it('requires a government card from a user who has none', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, ['requestFile']);

    expect(res.status).toBe(400);
    expect(await world.historyOf(user)).toEqual([0, 1, 3]);
    expect(await world.filesOf(user, 'reqFile')).toEqual([]);
    expect(assets()).toEqual([]);
  });

  it('accepts a government card without a request file and moves the user to 4', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, ['govCard']);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
    expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
    expect(await world.filesOf(user, 'reqFile')).toEqual([]);
  });

  it('stores the government card and experience form when no request file is sent', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, ['govCard', 'experienceForm']);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
    expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
    expect(await world.filesOf(user, 'expfile')).toHaveLength(1);
    expect(await world.filesOf(user, 'reqFile')).toEqual([]);
  });

  it('accepts all documents from a first-time user and moves them to 4', async () => {
    const user = await world.createUser({ history: [0, 1, 3] });

    const res = await upload(user, [
      'govCard',
      'requestFile',
      'experienceForm',
    ]);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4]);
    expect(await world.filesOf(user, 'govcard')).toHaveLength(1);
    expect(await world.filesOf(user, 'reqFile')).toHaveLength(1);
    expect(await world.filesOf(user, 'expfile')).toHaveLength(1);
  });

  it('lets a user who kept their government card advance to 4 without uploading it again', async () => {
    const user = await world.createUser({ history: [0, 1, 3, 4, 1, 3] });
    const kept = await world.giveFile(user, 'govcard');

    const res = await upload(user, ['requestFile']);

    expect(res.status).toBe(201);
    expect(await world.historyOf(user)).toEqual([0, 1, 3, 4, 1, 3, 4]);
    expect(await world.filesOf(user, 'govcard')).toEqual([{ url: kept }]);
    expect(existsSync(kept)).toBe(true);
  });

  it('replaces the existing file of each type that is uploaded again', async () => {
    const user = await world.createUser({ history: [0, 1, 3, 4, 1, 3] });
    const oldGovcard = await world.giveFile(user, 'govcard');
    const oldReqFile = await world.giveFile(user, 'reqFile');
    const oldExpfile = await world.giveFile(user, 'expfile');

    const res = await upload(user, [
      'govCard',
      'requestFile',
      'experienceForm',
    ]);

    expect(res.status).toBe(201);
    for (const [kind, old] of [
      ['govcard', oldGovcard],
      ['reqFile', oldReqFile],
      ['expfile', oldExpfile],
    ] as const) {
      const files = await world.filesOf(user, kind);
      expect(files).toHaveLength(1);
      expect(files[0].url).not.toBe(old);
      expect(existsSync(files[0].url)).toBe(true);
      expect(existsSync(old)).toBe(false);
    }
  });
});
