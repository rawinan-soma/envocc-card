import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { members, Prisma } from '@prisma/client';
import { addDays, clock, isoDate } from 'src/common/clock';
import { REQUEST_TYPES } from 'src/request/request-types';

export const latestCard = (db: Prisma.TransactionClient, userId: number) =>
  db.members.findFirst({ where: { userId }, orderBy: { member_id: 'desc' } });

export const inEffectToday = (): Prisma.membersWhereInput => {
  const today = clock.today();
  return {
    is_active: true,
    start_date: { lte: today },
    end_date: { gte: today },
  };
};

export const startNewCard = async (
  tx: Prisma.TransactionClient,
  userId: number,
  requestType: number,
  from: number,
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

  if (!(rule.oldCardStaysValid && from === 15)) {
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

// A card for a Request Type with newMemberNumber starts with the Old card's
// number and gets its own at step 7. Once given, no older card shares it, so
// passing step 7 again after a Revert keeps it. The number comes from
// members_member_no_seq; see .claude/skills/member-number.
export const memberNumberAtStep7 = async (
  tx: Prisma.TransactionClient,
  card: members,
  requestType: number,
) => {
  if (!REQUEST_TYPES[requestType]?.newMemberNumber) {
    return card.member_no;
  }
  const sharedWithOldCard = await tx.members.count({
    where: {
      userId: card.userId,
      member_no: card.member_no,
      member_id: { not: card.member_id },
    },
  });
  if (sharedWithOldCard === 0) {
    return card.member_no;
  }
  const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('members_member_no_seq')`;
  return Number(nextval);
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
