import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { TEMPLATE_DB } from './db-global-setup';

const serverUrl = () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL not set: run via test:e2e');
  return url;
};

const onServer = async (sql: string) => {
  const admin = new PrismaClient({ datasourceUrl: `${serverUrl()}/postgres` });
  try {
    await admin.$executeRawUnsafe(sql);
  } finally {
    await admin.$disconnect();
  }
};

export type TestDb = {
  prisma: PrismaClient;
  // Empties every table, leaving the schema in place.
  reset: () => Promise<void>;
  drop: () => Promise<void>;
};

// A fresh database for one spec file, cloned from the migrated template.
export const createTestDb = async (): Promise<TestDb> => {
  const name = `test_${randomUUID().replace(/-/g, '')}`;
  await onServer(`CREATE DATABASE "${name}" TEMPLATE "${TEMPLATE_DB}"`);
  const prisma = new PrismaClient({ datasourceUrl: `${serverUrl()}/${name}` });

  const tables = (
    await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    )
  ).map((t) => `"${t.tablename}"`);

  return {
    prisma,
    reset: async () => {
      await prisma.$executeRawUnsafe(
        `TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`,
      );
    },
    drop: async () => {
      await prisma.$disconnect();
      await onServer(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    },
  };
};
