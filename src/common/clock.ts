const DAY_MS = 24 * 60 * 60 * 1000;
const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000;

export const clock = {
  // Today's date in Thailand (UTC+7, no daylight saving), at UTC midnight like
  // the @db.Date columns it is compared with.
  today(): Date {
    const thailand = new Date(Date.now() + THAILAND_OFFSET_MS);
    return new Date(
      Date.UTC(
        thailand.getUTCFullYear(),
        thailand.getUTCMonth(),
        thailand.getUTCDate(),
      ),
    );
  },
};

export const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
