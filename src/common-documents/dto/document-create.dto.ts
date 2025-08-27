import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

export class DocumentCreateDto {
  @Type(() => Number)
  doc_type: number;

  @IsString()
  doc_name: string;

  @IsString()
  doc_file: string;

  @IsString()
  url: string;
}
