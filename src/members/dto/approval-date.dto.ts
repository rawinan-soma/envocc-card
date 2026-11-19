import { isISO8601, ValidateBy } from 'class-validator';

const isCalendarDate = (value: unknown) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  isISO8601(value, { strict: true });

export class ApprovalDateDto {
  @ValidateBy({
    name: 'isCalendarDate',
    validator: {
      validate: isCalendarDate,
      defaultMessage: () => 'startDate must be a date as YYYY-MM-DD',
    },
  })
  startDate: string;
}
