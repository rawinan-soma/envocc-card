import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetAllUserQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  page?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  fname_th?: string;

  @IsOptional()
  @IsString()
  lname_th?: string;

  @IsOptional()
  @IsString()
  institution_name?: string;
}
