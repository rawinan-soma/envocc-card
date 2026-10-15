import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { OrganizationService } from 'src/organizations/organization.service';
import { PublicOrgController } from 'src/organizations/public-org.controller';
import { seedOrganizations } from './support/org-fixtures';
import { startApp } from './support/test-app';
import { createTestDb, TestDb } from './support/test-db';

// A ministry with no executive position, as กระทรวงสาธารณสุข is seeded, and a
// department under it with a head.
const MINISTRY = 1;
const DEPARTMENT = 4;

describe('GET /public/organizations/:id', () => {
  let db: TestDb;
  let app: INestApplication<App>;

  // Seeded once: every test here is a read-only GET.
  beforeAll(async () => {
    db = await createTestDb();

    await seedOrganizations(db.prisma, [
      [MINISTRY, 'MINISTRY', null],
      [DEPARTMENT, 'DEPARTMENT', MINISTRY],
    ]);
    await db.prisma.positions.create({
      data: {
        position_id: 95,
        position_name: 'อธิบดีกรมการแพทย์',
        orgId: DEPARTMENT,
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicOrgController],
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: db.prisma },
      ],
    }).compile();
    app = await startApp(moduleRef);
  });

  afterAll(async () => {
    await app.close();
    await db.drop();
  });

  const organization = (id: number) =>
    request(app.getHttpServer()).get(`/public/organizations/${id}`);

  it('returns the organization, its parents and its executive', async () => {
    const res = await organization(DEPARTMENT).expect(200);

    expect(res.body).toMatchObject({
      department_id: DEPARTMENT,
      ministry_id: MINISTRY,
      executive_name: 'อธิบดีกรมการแพทย์',
      executive_id: 95,
    });
  });

  it('returns a null executive for an organization without one', async () => {
    const res = await organization(MINISTRY).expect(200);

    expect(res.body).toMatchObject({
      ministry_id: MINISTRY,
      executive_name: null,
      executive_id: null,
    });
  });
});
