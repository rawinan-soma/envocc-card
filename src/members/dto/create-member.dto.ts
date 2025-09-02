import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class MemeberCreateDto {
  @IsNumber()
  @Type(() => Number)
  user: number;

  @Type(() => Number)
  signer: number;
}
