import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  migrations: {
    seed: 'bun run prisma/seed.ts',
  },
  schema: 'prisma/schema.prisma',
});
