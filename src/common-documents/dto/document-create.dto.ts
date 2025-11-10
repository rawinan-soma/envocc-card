// import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class DocumentCreateDto {
  @IsString()
  doc_type: string;

  @IsString()
  doc_name: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  url?: string;
}
