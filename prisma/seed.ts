import { OrgLevel, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

console.log('--- SEED SCRIPT INITIALIZING ---');

const prisma = new PrismaClient();

function readJson(fileName: string) {
  const filePath = path.join(__dirname, 'data', fileName);
  try {
    return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
  } catch (err) {
    console.error(`ERROR READING ${fileName}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('--- Seeding main() starting ---');
  
  const data = {
    provinces: readJson('province.json'),
    seals: readJson('seals.json'),
    signatures: readJson('signer.json'),
    orgs: readJson('organizations.json'),
    positions: readJson('position.json'),
    positionLvls: readJson('position_lvls.json'),
    requestStatuses: readJson('request_statuses.json'),
    admins: readJson('admins.json'),
  };

  console.log('Connecting to DB...');
  await prisma.$connect();
  console.log('Connected.');

  // Create sets for fast lookup
  const validOrgIds = new Set(data.orgs.map((o: any) => o.id));
  const validSealIds = new Set(data.seals.map((s: any) => s.id));
  const validSignerIds = new Set(data.signatures.map((s: any) => s.id));
  const validPositionIds = new Set(data.positions.map((p: any) => p.position_id));
  const validPosLvIds = new Set(data.positionLvls.map((l: any) => l.position_lv_id));

  console.log('Starting Transactional Upsert...');

  await prisma.$transaction(async (tx) => {
    console.log('Upserting provinces...');
    for (const item of data.provinces) {
      await tx.province.upsert({ where: { provinceId: item.provinceId }, update: item, create: item });
    }

    console.log('Upserting seals...');
    for (const item of data.seals) {
      await tx.seals.upsert({ where: { id: item.id }, update: item, create: item });
    }

    console.log('Upserting signatures...');
    for (const item of data.signatures) {
      await tx.signatures.upsert({ where: { id: item.id }, update: item, create: item });
    }

    console.log('Upserting organizations...');
    for (const item of data.orgs) {
      // Validate FKs for organization
      if (!validSealIds.has(item.sealId) || !validSignerIds.has(item.signatureId)) {
          console.warn(`Skipping organization ${item.id}: invalid sealId ${item.sealId} or signatureId ${item.signatureId}`);
          continue;
      }
      const d = { ...item, level: OrgLevel[item.level as keyof typeof OrgLevel] };
      await tx.organizations.upsert({ where: { id: item.id }, update: d, create: d });
    }

    console.log('Upserting positions...');
    for (const item of data.positions) {
      if (item.orgId && !validOrgIds.has(item.orgId)) {
          console.warn(`Skipping position ${item.position_id}: orgId ${item.orgId} not found`);
          continue;
      }
      await tx.positions.upsert({ where: { position_id: item.position_id }, update: item, create: item });
    }

    console.log('Upserting position levels...');
    for (const item of data.positionLvls) {
      await tx.position_lvs.upsert({ where: { position_lv_id: item.position_lv_id }, update: item, create: item });
    }

    console.log('Upserting request statuses...');
    for (const item of data.requestStatuses) {
      await tx.request_statuses.upsert({ where: { status_id: item.status_id }, update: item, create: item });
    }

    console.log('Upserting admins...');
    for (const item of data.admins) {
      if (!validOrgIds.has(item.organizationId) || !validPositionIds.has(item.positionId) || !validPosLvIds.has(item.positionLvId)) {
          console.warn(`Skipping admin ${item.username}: invalid FK references`);
          continue;
      }
      await tx.admins.upsert({ where: { username: item.username }, update: item, create: item });
    }

    const tables = ['organizations', 'signatures', 'seals', 'admins'];
    console.log('Resetting sequences...');
    for (const t of tables) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1), true)`
      );
    }
  }, {
      timeout: 120000 // 2 minutes
  });

  console.log('--- SEEDING COMPLETE ---');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('--- SEEDING FAILED ---');
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
