import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class StatusCreateDto {
  @IsNumber()
  @Type(() => Number)
  user: number;

  @IsNumber()
  current_status: number;

  @IsNumber()
  next_status: number;

  @IsNumber()
  request_type: number;

  @IsString()
  description?: string;
}
