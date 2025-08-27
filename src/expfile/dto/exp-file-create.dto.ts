import { Type } from 'class-transformer';
import { IsString, IsNumber } from 'class-validator';

export class ExpFileCreateDto {
  @IsNumber()
  @Type(() => Number)
  user: number;

  @IsString()
  file_name: string;

  url: string;
}
