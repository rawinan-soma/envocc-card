import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class MemeberCreateDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsNumber()
  @Type(() => Number)
  signature_method: number;

  // @Type(() => Number)
  @IsOptional()
  signatureId?: number;
}
