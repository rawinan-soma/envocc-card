import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from 'prisma/prisma.service';
import { PositionsService } from 'src/positions/positions.service';
import { PublicPositionController } from 'src/positions/public-position.controller';
import { startApp } from './support/test-app';
import { createTestDb, TestDb } from './support/test-db';

const DEPARTMENT = 4;
const DIVISION = 94;

describe('GET /public/positions', () => {
  let db: TestDb;
  let app: INestApplication<App>;

  beforeAll(async () => {
    db = await createTestDb();

    await db.prisma.seals.create({ data: { adminId: 1 } });
    await db.prisma.signatures.create({
      data: {
        sign_person_position: 'director',
        sign_person_pname: 'Mr',
        sign_person_name: 'Signer',
        sign_person_lname: 'Person',
        filename: 'signature.png',
        admin: 1,
      },
    });
    for (const id of [DEPARTMENT, DIVISION]) {
      await db.prisma.organizations.create({
        data: {
          id,
          level: 'DEPARTMENT',
          code: `org-${id}`,
          name_th: `org ${id}`,
          name_eng: `org ${id}`,
          sealId: 1,
          signatureId: 1,
        },
      });
    }
    // Deputy inserted before its head to prove the response is sorted by id.
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
        { position_id: 103, position_name: 'ผู้อำนวยการกอง', orgId: DIVISION },
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
    const res = await positions(`?orgId=${DIVISION}`).expect(200);

    expect(res.body).toEqual([
      { position_id: 103, position_name: 'ผู้อำนวยการกอง' },
    ]);
  });

  it('returns an empty array for an organization with no positions', async () => {
    const res = await positions('?orgId=999').expect(200);

    expect(res.body).toEqual([]);
  });

  it('returns the non-executive positions without orgId', async () => {
    const res = await positions().expect(200);

    expect(res.body).toEqual([
      { position_id: 201, position_name: 'นักวิชาการ' },
    ]);
  });
});
