import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class FileCreateDto {
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  userId: number | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  adminId: number | null;

  @IsString()
  file_name: string;

  url: string;
}
