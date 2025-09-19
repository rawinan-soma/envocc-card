import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class MemeberCreateDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @Type(() => Number)
  signatureId: number;
}
