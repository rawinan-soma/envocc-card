import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { canEditPersonalData } from 'src/request/request-statuses';
import { latestStatusEntry, lockUser } from 'src/request/status-history';

// Edit personal data (CONTEXT.md): runs `write` only while the user's Request
// Status allows it. The check and the write share one transaction under the
// user lock, so an admin cannot move the user on between them.
export const editPersonalData = <T>(
  prisma: PrismaService,
  userId: number,
  write: (tx: Prisma.TransactionClient) => Promise<T>,
) =>
  prisma.$transaction(async (tx) => {
    if ((await lockUser(tx, userId)).length === 0) {
      throw new NotFoundException('user not found');
    }
    const current = await latestStatusEntry(tx, userId);
    if (!current || !canEditPersonalData(current.request_status)) {
      throw new ForbiddenException(
        'personal data can be edited only at request status 0, 1 or 6',
      );
    }
    return write(tx);
  });
