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

// Serializes every writer of a user's card request (Status History, uploaded
// files) by holding the user's row until the transaction ends. Call it first:
// before any read the write depends on, and before touching other tables, so
// two transactions on one user always queue in the same order.
export const lockUser = (tx: Prisma.TransactionClient, userId: number) =>
  tx.$queryRaw`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;

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
// It takes the user lock itself, so pass a transaction client or the lock ends
// with that statement. A caller that already holds the lock pays nothing.
export const addStatusEntry = async (
  db: Prisma.TransactionClient,
  { userId, status, requestType, approver, description, from }: NewStatusEntry,
) => {
  await lockUser(db, userId);
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
