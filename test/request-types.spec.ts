import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FIRST_CARD,
  REQUEST_TYPES,
  USER_STARTED_TYPES,
} from 'src/request/request-types';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const registered = Object.entries(REQUEST_TYPES).map(([type, { name }]) => ({
  type_id: Number(type),
  type_name: name,
}));

const documented = () => {
  const context = read('CONTEXT.md');
  const section = context.slice(context.indexOf('**Request Type**'));
  const sentence = section.slice(0, section.indexOf('.'));
  return [...sentence.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
};

describe('Request Types', () => {
  it('are the types CONTEXT.md lists', () => {
    expect(registered.map((t) => t.type_id)).toEqual(documented());
  });

  it('are seeded with the same names', () => {
    expect(JSON.parse(read('prisma/data/request_types.json'))).toEqual(
      registered,
    );
  });

  it('are inserted by the migration with the same names', () => {
    const sql = read(
      'prisma/migrations/20261121090000_request_types/migration.sql',
    );
    const rows = [...sql.matchAll(/^ {2}\((\d+), '([^']+)'\)/gm)].map((m) => ({
      type_id: Number(m[1]),
      type_name: m[2],
    }));
    expect(rows).toEqual(registered);
  });

  it('can all be started by a user except the first card', () => {
    expect(USER_STARTED_TYPES).toEqual(
      registered.map((t) => t.type_id).filter((t) => t !== FIRST_CARD),
    );
  });
});
