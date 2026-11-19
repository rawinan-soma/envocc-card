// Every Request Status (see the table under Request Status in CONTEXT.md) and
// the moves into it that are not ordinary forward steps.
interface RequestStatusRule {
  retired?: true;
  userSendsDocuments?: true;
  userEditsPersonalData?: true;
  revertFrom?: readonly [number, number];
}

export const REQUEST_STATUSES: Readonly<Record<number, RequestStatusRule>> = {
  0: { userEditsPersonalData: true, revertFrom: [1, 6] },
  1: {
    userSendsDocuments: true,
    userEditsPersonalData: true,
    revertFrom: [2, 14],
  },
  2: { retired: true },
  3: { retired: true },
  4: {},
  5: { retired: true },
  6: {
    userSendsDocuments: true,
    userEditsPersonalData: true,
    revertFrom: [7, 14],
  },
  7: { revertFrom: [8, 14] },
  8: {},
  9: {},
  10: {},
  11: {},
  12: {},
  13: {},
  14: {},
  15: { revertFrom: [16, 16] },
  16: {},
};

export const SIGNING_METHOD_STATUSES: readonly number[] = [8, 10, 11];

export const USER_SENDS_DOCUMENTS_STATUSES = Object.entries(
  REQUEST_STATUSES,
).flatMap(([status, rule]) =>
  rule.userSendsDocuments ? [Number(status)] : [],
);

export const canReplacePhoto = (status: number) =>
  USER_SENDS_DOCUMENTS_STATUSES.includes(status);

export const canEditPersonalData = (status: number) =>
  REQUEST_STATUSES[status]?.userEditsPersonalData === true;

export const isRevert = (from: number, target: number) => {
  const range = REQUEST_STATUSES[target]?.revertFrom;
  return range !== undefined && from >= range[0] && from <= range[1];
};

export const adminUpdateRefusal = (from: number, to: number) => {
  const rule = REQUEST_STATUSES[to];
  if (!rule || rule.retired) {
    return `request status ${to} is not in use`;
  }
  if (to === from) {
    return `user's already in this status`;
  }
  if (rule.revertFrom && to < from) {
    return `moving back to ${to} is a revert: use POST admins/users/:userId/requests/revert`;
  }
  return undefined;
};
