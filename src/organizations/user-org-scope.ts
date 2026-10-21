import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

// An admin's scope is their own organization and every organization below it.
// Walks the user's organization up through parentId until it reaches orgId.
export const assertUserInOrg = async (
  db: Prisma.TransactionClient | PrismaService,
  orgId: number,
  userId: number,
) => {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  if (!user) {
    throw new NotFoundException('user not found');
  }

  let current: number | null = user.organizationId;
  while (current !== null && current !== orgId) {
    const org: { parentId: number | null } | null =
      await db.organizations.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
    current = org?.parentId ?? null;
  }

  if (current === null) {
    throw new ForbiddenException('user is outside your organization');
  }
};
