import { readFileSync } from 'fs';
import { join } from 'path';
import { REQUEST_STATUSES } from 'src/request/request-statuses';

const root = join(__dirname, '..');

const seeded = JSON.parse(
  readFileSync(join(root, 'prisma/data/request_statuses.json'), 'utf8'),
) as { status_id: number; status_name: string }[];

// The Status column of the table under **Request Status** in CONTEXT.md.
const documentedInUse = () => {
  const context = readFileSync(join(root, 'CONTEXT.md'), 'utf8');
  const section = context.slice(context.indexOf('**Request Status**'));
  const table = section.slice(0, section.indexOf('_Avoid_'));
  return [...table.matchAll(/^\| (\d+) \|/gm)].map((m) => Number(m[1]));
};

const RETIRED = ' (เลิกใช้)';

describe('Request Statuses', () => {
  const statuses = Object.keys(REQUEST_STATUSES).map(Number);
  const inUse = statuses.filter((s) => !REQUEST_STATUSES[s].retired);

  it('are in use exactly as the table in CONTEXT.md lists them', () => {
    expect(inUse).toEqual(documentedInUse());
  });

  it('are all seeded, retired ones included', () => {
    expect(seeded.map((s) => s.status_id)).toEqual(statuses);
  });

  it('are seeded with "(เลิกใช้)" on the retired ones and only those', () => {
    const marked = seeded
      .filter((s) => s.status_name.endsWith(RETIRED))
      .map((s) => s.status_id);
    expect(marked).toEqual([2, 3, 5]);
    expect(statuses.filter((s) => REQUEST_STATUSES[s].retired)).toEqual(marked);
  });
});
