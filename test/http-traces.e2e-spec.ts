import { SpanKind } from '@opentelemetry/api';
import {
  ADMIN,
  CardRequestWorld,
  createCardRequestWorld,
} from './support/card-request-world';

describe('HTTP requests as traces', () => {
  let world: CardRequestWorld;

  beforeAll(async () => {
    world = await createCardRequestWorld();
  });
  afterAll(() => world.drop());
  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const serverSpans = () =>
    world.spans().filter((s) => s.kind === SpanKind.SERVER);

  it('records one server span named by method and route template, carrying the admin id', async () => {
    const user = await world.createUser({ history: [0, 1, 3, 4] });

    const res = await world
      .asAdmin(ADMIN.MINISTRY)
      .post(`/admins/users/${user}/requests/revert?note=secret-query`)
      .send({ current_status: 4, target_status: 1 });

    expect(res.status).toBe(201);
    const spans = serverSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('POST /admins/users/:userId/requests/revert');
    expect(spans[0].attributes).toEqual({
      'http.request.method': 'POST',
      'http.route': '/admins/users/:userId/requests/revert',
      'http.response.status_code': 201,
      'admin.id': ADMIN.MINISTRY,
    });
  });

  it('carries the user id on a user request', async () => {
    const user = await world.createUser({ history: [0, 1] });

    const res = await world.asUser(user).get('/users/me');

    expect(res.status).toBe(200);
    expect(serverSpans().map((s) => s.attributes)).toEqual([
      {
        'http.request.method': 'GET',
        'http.route': '/users/me',
        'http.response.status_code': 200,
        'user.id': user,
      },
    ]);
  });

  it('records a request turned away by a guard, with no id', async () => {
    const res = await world.anonymous().get('/users/me');

    expect(res.status).toBe(401);
    expect(serverSpans().map((s) => [s.name, s.attributes])).toEqual([
      [
        'GET /users/me',
        {
          'http.request.method': 'GET',
          'http.route': '/users/me',
          'http.response.status_code': 401,
        },
      ],
    ]);
  });

  it('names an unmatched request by its method only, never its path', async () => {
    const res = await world.anonymous().get('/no/such/user@example.com');

    expect(res.status).toBe(404);
    expect(serverSpans().map((s) => [s.name, s.attributes])).toEqual([
      [
        'GET',
        { 'http.request.method': 'GET', 'http.response.status_code': 404 },
      ],
    ]);
  });
});
