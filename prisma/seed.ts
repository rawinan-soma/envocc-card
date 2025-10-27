/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { OrgLevel, PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const existingData = await prisma.organizations.count();

  if (existingData > 0) {
    console.log('Already seeded, skipping...');
    return;
  }
  return prisma.$transaction(async (tx) => {
    const province = JSON.parse(
      fs.readFileSync('./prisma/data/province.json', 'utf-8'),
    );
    await tx.province.createMany({ data: province });
    // const ministries = JSON.parse(
    //   fs.readFileSync('./prisma/data/ministries.json', 'utf-8'),
    // );
    // await tx.ministries.createMany({
    //   data: ministries,
    // });
    // const access_levels = JSON.parse(
    //   fs.readFileSync('./prisma/data/access_levels.json', 'utf-8'),
    // );
    // await tx.access_levels.createMany({
    //   data: access_levels,
    // });
    const seals = JSON.parse(
      fs.readFileSync('./prisma/data/seals.json', 'utf-8'),
    );
    await tx.seals.createMany({
      data: seals,
    });
    const signatures = JSON.parse(
      fs.readFileSync('./prisma/data/signer.json', 'utf-8'),
    );
    await tx.signatures.createMany({ data: signatures });

    // const departments = JSON.parse(
    //   fs.readFileSync('./prisma/data/departments.json', 'utf-8'),
    // );
    // await tx.departments.createMany({
    //   data: departments,
    // });
    // const institutions = JSON.parse(
    //   fs.readFileSync('./prisma/data/institution.json', 'utf-8'),
    // );
    // await tx.institutions.createMany({
    //   data: institutions,
    // });

    const org = JSON.parse(
      fs.readFileSync('./prisma/data/organizations.json', 'utf-8'),
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const orgReady = org.map((o: any) => ({
      ...o,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      level: OrgLevel[o.level as keyof typeof OrgLevel],
    }));

    await tx.organizations.createMany({ data: orgReady });

    const positions = JSON.parse(
      fs.readFileSync('./prisma/data/position.json', 'utf-8'),
    );
    await tx.positions.createMany({
      data: positions,
    });

    const position_lvls = JSON.parse(
      fs.readFileSync('./prisma/data/position_lvls.json', 'utf-8'),
    );
    await tx.position_lvs.createMany({
      data: position_lvls,
    });

    // const epositions = JSON.parse(
    //   fs.readFileSync('./prisma/data/eposition.json', 'utf-8'),
    // );
    // await tx.epositions.createMany({
    //   data: epositions,
    // });

    const request_statuses = JSON.parse(
      fs.readFileSync('./prisma/data/request_statuses.json', 'utf-8'),
    );
    await tx.request_statuses.createMany({
      data: request_statuses,
    });

    const admins = JSON.parse(
      fs.readFileSync('./prisma/data/admins.json', 'utf-8'),
    );

    await tx.admins.createMany({
      data: admins,
    });

    // // TODO:seed user -> Remove on production
    // const users = JSON.parse(
    //   fs.readFileSync('./prisma/data/users.json', 'utf-8'),
    // );
    // for (const userData of users) {
    //   await tx.users.create({
    //     data: {
    //       ...userData.user,
    //       birthday: new Date(userData.user.birthday as string),
    //       position: 1,
    //       experiences: {
    //         createMany: {
    //           data: userData.experiences.map((exp) => ({
    //             ...exp,
    //             exp_fdate: new Date(exp.exp_fdate as string),
    //             exp_ldate: new Date(exp.exp_ldate as string),
    //           })),
    //         },
    //       },
    //       requests: { create: { request_status: 0, request_type: 1 } },
    //     },
    //   });
    // }
    // const users = JSON.parse(
    //   fs.readFileSync('./prisma/data/users.json', 'utf-8'),
    // );
    // await tx.users.createMany({
    //   data: users,
    // });
    // const experiences = JSON.parse(
    //   fs.readFileSync('./prisma/data/experiences.json', 'utf-8'),
    // );
    // await tx.experiences.createMany({
    //   data: experiences,
    // });
    // const requests = JSON.parse(
    //   fs.readFileSync('./prisma/data/requests.json', 'utf-8'),
    // );
    // await tx.requests.createMany({
    //   data: requests,
    // });
  });
}

main()
  .then(async () => {
    console.log('Seeding complete');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.log(e);
    await prisma.$disconnect();
    process.exit(1);
  });
