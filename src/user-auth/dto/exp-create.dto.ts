import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class ExpCreateDto {
  @IsDate()
  @Type(() => Date)
  exp_fdate: Date;

  @IsDate()
  @Type(() => Date)
  exp_ldate: Date;

  @IsNumber()
  @Type(() => Number)
  exp_typeoffice: number;

  @IsString()
  exp_office: string;

  @IsString()
  exp_position: string;

  @IsString()
  exp_work: string;
}
