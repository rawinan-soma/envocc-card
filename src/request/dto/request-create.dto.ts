import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class RequestCreateDto {
  @IsNumber()
  @Type(() => Number)
  user: number;

  @IsNumber()
  @Type(() => Number)
  request_status: number;

  @IsNumber()
  @Type(() => Number)
  request_type: number;
}
