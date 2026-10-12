import { execFileSync } from 'child_process';

export const TEMPLATE_DB = 'envocc_template';
const CONTAINER = `envocc-card-test-db-${process.pid}`;
const PASSWORD = 'test';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Built from schema.prisma (what the generated client expects) rather than
// prisma/migrations, which have drifted from it (e.g. admins.positionId).
const buildTemplate = (serverUrl: string) =>
  execFileSync('bunx', ['prisma', 'db', 'push', '--skip-generate'], {
    env: { ...process.env, DATABASE_URL: `${serverUrl}/${TEMPLATE_DB}` },
    stdio: 'ignore',
  });

// Starts one throwaway Postgres for the whole e2e run and builds a template
// database that each DB-backed spec clones (see test-db.ts). Set
// TEST_DATABASE_URL (server URL, no database name) to use an existing server.
export default async function setup() {
  if (process.env.TEST_DATABASE_URL) {
    buildTemplate(process.env.TEST_DATABASE_URL);
    return;
  }

  execFileSync('docker', [
    'run',
    '-d',
    '--rm',
    '--name',
    CONTAINER,
    '-e',
    `POSTGRES_PASSWORD=${PASSWORD}`,
    '-p',
    '127.0.0.1::5432',
    'postgres:17-alpine',
  ]);
  process.env.TEST_DB_CONTAINER = CONTAINER;

  const port = execFileSync('docker', ['port', CONTAINER, '5432'])
    .toString()
    .split('\n')[0]
    .split(':')
    .pop();
  const serverUrl = `postgresql://postgres:${PASSWORD}@127.0.0.1:${port}`;

  for (let i = 0; ; i++) {
    try {
      buildTemplate(serverUrl);
      break;
    } catch (err) {
      if (i > 40) throw err;
      await sleep(250);
    }
  }

  process.env.TEST_DATABASE_URL = serverUrl;
}
