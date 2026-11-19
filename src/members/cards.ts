import { Prisma } from '@prisma/client';
import { REQUEST_TYPES } from 'src/request/request-types';

// What starting a request for a new card does to the user's Old card. Call it
// inside the transaction that adds the request's first status entry, under
// lockUser.
export const startNewCard = async (
  tx: Prisma.TransactionClient,
  userId: number,
  requestType: number,
) => {
  if (!REQUEST_TYPES[requestType].oldCardStaysValid) {
    await tx.members.updateMany({
      where: { userId },
      data: { is_active: false },
    });
  }
};

// Whether a user's card verifies at their current Request Status: once the
// card is issued (15), and while a request runs whose Old card stays valid.
export const cardVerifiesAt = ({
  request_status,
  request_type,
}: {
  request_status: number;
  request_type: number;
}) =>
  request_status === 15 ||
  (request_status !== 16 &&
    REQUEST_TYPES[request_type]?.oldCardStaysValid === true);

// The new card becomes valid when its request reaches 15 (card request
// succeeded), whether forward from the last step or by a Revert from 16.
export const issueCard = (tx: Prisma.TransactionClient, userId: number) =>
  tx.members.updateMany({ where: { userId }, data: { is_active: true } });
