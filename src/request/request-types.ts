// Every Request Type (see Request Type in CONTEXT.md), named as in the
// request_types table.
interface RequestTypeRule {
  name: string;
  // The Request Statuses a user may start a request of this type from
  // (POST users/me/card). Left out when no user may start it.
  userStartsFrom?: readonly number[];
  // Starting the request keeps the user's photo: the Old card stays valid
  // until its end date, and the online card shows that photo.
  keepsPhoto?: true;
}

// Registering starts a first-card request; a user cannot pick it.
export const FIRST_CARD = 1;

const CARD_ISSUED_OR_CANCELLED = [15, 16] as const;

export const REQUEST_TYPES: Readonly<Record<number, RequestTypeRule>> = {
  [FIRST_CARD]: { name: 'ครั้งแรก' },
  2: {
    name: 'บัตรหมดอายุ',
    userStartsFrom: CARD_ISSUED_OR_CANCELLED,
    keepsPhoto: true,
  },
  3: { name: 'บัตรสูญหาย', userStartsFrom: CARD_ISSUED_OR_CANCELLED },
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
  11: { name: 'ย้ายสังกัด', userStartsFrom: CARD_ISSUED_OR_CANCELLED },
};

export const USER_STARTED_TYPES = Object.entries(REQUEST_TYPES).flatMap(
  ([type, rule]) => (rule.userStartsFrom ? [Number(type)] : []),
);

// A request for a new card: any type but the first card.
export const isNewCardRequest = (type: number) => type !== FIRST_CARD;
