import { OrgLevel, PrismaClient } from '@prisma/client';

export type OrgFixture = [id: number, level: OrgLevel, parentId: number | null];

// Organizations need a seal and a signature; every fixture org shares
// seal 1 and signature 1.
export const seedOrganizations = async (
  prisma: PrismaClient,
  orgs: OrgFixture[],
) => {
  await prisma.seals.create({ data: { adminId: 1 } });
  await prisma.signatures.create({
    data: {
      sign_person_position: 'director',
      sign_person_pname: 'Mr',
      sign_person_name: 'Signer',
      sign_person_lname: 'Person',
      filename: 'signature.png',
      admin: 1,
    },
  });

  for (const [id, level, parentId] of orgs) {
    await prisma.organizations.create({
      data: {
        id,
        level,
        parentId,
        code: `org-${id}`,
        name_th: `org ${id}`,
        name_eng: `org ${id}`,
        sealId: 1,
        signatureId: 1,
      },
    });
  }
};
