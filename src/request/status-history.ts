import { Prisma } from '@prisma/client';

export interface NewStatusEntry {
  userId: number;
  status: number;
  requestType: number;
  approver?: number;
  description?: string;
  // The Request Status being left: null for a user's first entry. Looked up
  // from the Status History when left out.
  from?: number | null;
}

// The one place a new Request Status is written to a user's Status History.
// Pass a transaction client to write inside an existing transaction.
export const addStatusEntry = async (
  db: Prisma.TransactionClient,
  { userId, status, requestType, approver, description, from }: NewStatusEntry,
) => {
  if (from === undefined) {
    const current = await db.requests.findFirst({
      where: { userId },
      orderBy: { date_update: 'desc' },
      select: { request_status: true },
    });
    from = current?.request_status ?? null;
  }

  const entry = await db.requests.create({
    data: {
      userId,
      request_status: status,
      request_type: requestType,
      approver,
      description,
    },
  });

  return { entry, from };
};
