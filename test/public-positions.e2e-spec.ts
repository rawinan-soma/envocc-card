import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { PositionsService } from 'src/positions/positions.service';
import { PublicPositionController } from 'src/positions/public-position.controller';
import { seedOrganizations } from './support/org-fixtures';
import { startApp } from './support/test-app';
import { createTestDb, TestDb } from './support/test-db';

// A department with a head and a deputy, and a unit with only a director.
const DEPARTMENT = 4;
const UNIT = 94;

describe('GET /public/positions', () => {
  let db: TestDb;
  let app: INestApplication<App>;

  // Seeded once: every test here is a read-only GET.
  beforeAll(async () => {
    db = await createTestDb();

    await seedOrganizations(db.prisma, [
      [DEPARTMENT, 'DEPARTMENT', null],
      [UNIT, 'UNIT', DEPARTMENT],
    ]);
    // Inserted out of id order to prove the response is sorted by id.
    await db.prisma.positions.createMany({
      data: [
        {
          position_id: 96,
          position_name: 'รองอธิบดีกรมการแพทย์',
          orgId: DEPARTMENT,
        },
        {
          position_id: 95,
          position_name: 'อธิบดีกรมการแพทย์',
          orgId: DEPARTMENT,
        },
        { position_id: 103, position_name: 'ผู้อำนวยการกอง', orgId: UNIT },
        { position_id: 202, position_name: 'นักวิชาการชำนาญการ', orgId: null },
        { position_id: 201, position_name: 'นักวิชาการ', orgId: null },
      ],
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicPositionController],
      providers: [
        PositionsService,
        { provide: PrismaService, useValue: db.prisma },
      ],
    }).compile();
    app = await startApp(moduleRef, { validation: true });
  });

  afterAll(async () => {
    await app.close();
    await db.drop();
  });

  const positions = (query = '') =>
    request(app.getHttpServer()).get(`/public/positions${query}`);

  it('returns every executive position of the organization, head first', async () => {
    const res = await positions(`?orgId=${DEPARTMENT}`).expect(200);

    expect(res.body).toEqual([
      { position_id: 95, position_name: 'อธิบดีกรมการแพทย์' },
      { position_id: 96, position_name: 'รองอธิบดีกรมการแพทย์' },
    ]);
  });

  it('returns a one-element array for an organization with a single director', async () => {
    const res = await positions(`?orgId=${UNIT}`).expect(200);

    expect(res.body).toEqual([
      { position_id: 103, position_name: 'ผู้อำนวยการกอง' },
    ]);
  });

  it('returns an empty array for an organization with no positions', async () => {
    const res = await positions('?orgId=999').expect(200);

    expect(res.body).toEqual([]);
  });

  it('returns the non-executive positions without orgId, sorted by id', async () => {
    const res = await positions().expect(200);

    expect(res.body).toEqual([
      { position_id: 201, position_name: 'นักวิชาการ' },
      { position_id: 202, position_name: 'นักวิชาการชำนาญการ' },
    ]);
  });
});
