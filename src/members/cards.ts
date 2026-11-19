import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addDays, clock, isoDate } from 'src/common/clock';
import { REQUEST_TYPES } from 'src/request/request-types';

// A user's cards are their members rows, one per card, and a new card keeps
// the Member Number and QR code of the one before it. The latest row is the
// card of the user's current request: being issued while the request runs,
// the card in hand once it reaches 15. An earlier row stays as the Old card,
// with its own dates, so a type 2 Old card is still shown until its end date.
export const latestCard = (db: Prisma.TransactionClient, userId: number) =>
  db.members.findFirst({ where: { userId }, orderBy: { member_id: 'desc' } });

// The card in effect today: valid, and today between its start and end dates.
export const inEffectToday = (): Prisma.membersWhereInput => {
  const today = clock.today();
  return {
    is_active: true,
    start_date: { lte: today },
    end_date: { gte: today },
  };
};

// What starting a request for a new card does to the user's cards: the Old
// card stops being valid unless the type keeps it, and the new card is added,
// not valid until the request reaches 15. Call it inside the transaction that
// adds the request's first status entry, under lockUser.
export const startNewCard = async (
  tx: Prisma.TransactionClient,
  userId: number,
  requestType: number,
) => {
  const rule = REQUEST_TYPES[requestType];
  const oldCard = await latestCard(tx, userId);
  if (!oldCard) {
    return;
  }

  const daysBefore = rule.startsDaysBeforeEndDate;
  if (daysBefore !== undefined && oldCard.end_date) {
    const opens = addDays(oldCard.end_date, -daysBefore);
    if (clock.today() < opens) {
      throw new ForbiddenException(
        `a request of type ${requestType} can be started only from ${isoDate(opens)}, ${daysBefore} days before the card's end date`,
      );
    }
  }

  if (!rule.oldCardStaysValid) {
    await tx.members.updateMany({
      where: { userId },
      data: { is_active: false },
    });
  }

  await tx.members.create({
    data: {
      userId,
      member_no: oldCard.member_no,
      qrcode: oldCard.qrcode,
      qrcode_pass: oldCard.qrcode_pass,
      signatureId: oldCard.signatureId,
      is_active: false,
    },
  });
};

// When the Old card stays valid and has not yet expired, the new card's
// Approval date must fall after the Old card's end date, so the two never
// overlap. See Approval date in CONTEXT.md.
export const assertApprovalDate = async (
  tx: Prisma.TransactionClient,
  userId: number,
  requestType: number,
  approvalDate: Date,
) => {
  if (!REQUEST_TYPES[requestType]?.oldCardStaysValid) {
    return;
  }
  const [, oldCard] = await tx.members.findMany({
    where: { userId },
    orderBy: { member_id: 'desc' },
    take: 2,
  });
  const end = oldCard?.is_active ? oldCard.end_date : null;
  if (end && end >= clock.today() && approvalDate <= end) {
    throw new BadRequestException(
      `the approval date must be after the Old card's end date, ${isoDate(end)}`,
    );
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
export const issueCard = async (
  tx: Prisma.TransactionClient,
  userId: number,
) => {
  const card = await latestCard(tx, userId);
  if (card) {
    await tx.members.update({
      where: { member_id: card.member_id },
      data: { is_active: true },
    });
  }
};
