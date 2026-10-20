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

// A user may replace their photo only while it is still being checked (1) or
// corrected (2), or their documents are still being uploaded (3). See Replace
// photo in CONTEXT.md.
export const PHOTO_REPLACEABLE_STATUSES: readonly number[] = [1, 2, 3];

export const canReplacePhoto = (status: number) =>
  PHOTO_REPLACEABLE_STATUSES.includes(status);

// The user's Request Status is whatever their most recent entry says.
export const latestStatusEntry = (
  db: Prisma.TransactionClient,
  userId: number,
) =>
  db.requests.findFirst({
    where: { userId },
    orderBy: { date_update: 'desc' },
  });

// The one place a new Request Status is written to a user's Status History.
// Pass a transaction client to write inside an existing transaction.
export const addStatusEntry = async (
  db: Prisma.TransactionClient,
  { userId, status, requestType, approver, description, from }: NewStatusEntry,
) => {
  if (from === undefined) {
    const current = await latestStatusEntry(db, userId);
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
