// Every Request Type (see Request Type in CONTEXT.md), named as in the
// request_types table.
interface RequestTypeRule {
  name: string;
  userStartsFrom?: readonly number[];
  needsPoliceReport?: true;
  // The Old card stays valid while the request runs (see Old card in
  // CONTEXT.md), so starting it keeps the photo the online card shows. For
  // every other type the Old card stops being valid when the request starts.
  oldCardStaysValid?: true;
  startsDaysBeforeEndDate?: number;
  // The new card gets a Member Number never used before instead of keeping the
  // Old card's (see Member Number in CONTEXT.md).
  newMemberNumber?: true;
}

export const FIRST_CARD = 1;

const CARD_ISSUED_OR_CANCELLED = [15, 16] as const;

export const REQUEST_TYPES: Readonly<Record<number, RequestTypeRule>> = {
  [FIRST_CARD]: { name: 'ครั้งแรก' },
  2: {
    name: 'บัตรหมดอายุ',
    userStartsFrom: CARD_ISSUED_OR_CANCELLED,
    oldCardStaysValid: true,
    startsDaysBeforeEndDate: 30,
  },
  3: {
    name: 'บัตรสูญหาย',
    userStartsFrom: CARD_ISSUED_OR_CANCELLED,
    needsPoliceReport: true,
  },
  4: { name: 'บัตรถูกทำลาย', userStartsFrom: CARD_ISSUED_OR_CANCELLED },
  5: { name: 'เปลี่ยนชื่อตัว', userStartsFrom: CARD_ISSUED_OR_CANCELLED },
  6: { name: 'เปลี่ยนชื่อสกุล', userStartsFrom: CARD_ISSUED_OR_CANCELLED },
  7: {
    name: 'เปลี่ยนชื่อตัวและชื่อสกุล',
    userStartsFrom: CARD_ISSUED_OR_CANCELLED,
  },
  8: {
    name: 'เปลี่ยนคำนำหน้าชื่อตัว',
    userStartsFrom: CARD_ISSUED_OR_CANCELLED,
  },
  9: {
    name: 'เลื่อนยศหรือชั้นหรือระดับ',
    userStartsFrom: CARD_ISSUED_OR_CANCELLED,
  },
  10: { name: 'เปลี่ยนตำแหน่ง', userStartsFrom: CARD_ISSUED_OR_CANCELLED },
  11: { name: 'ย้ายสังกัด', userStartsFrom: [16], newMemberNumber: true },
};

export const USER_STARTED_TYPES = Object.entries(REQUEST_TYPES).flatMap(
  ([type, rule]) => (rule.userStartsFrom ? [Number(type)] : []),
);

export const isNewCardRequest = (type: number) => type !== FIRST_CARD;
