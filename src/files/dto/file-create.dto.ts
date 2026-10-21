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

export function fileDto(
  file: Express.Multer.File,
  userId: number | null,
  adminId?: number,
): FileCreateDto;
export function fileDto(
  file: Express.Multer.File | undefined,
  userId: number | null,
  adminId?: number,
): FileCreateDto | undefined;
export function fileDto(
  file: Express.Multer.File | undefined,
  userId: number | null,
  adminId?: number,
): FileCreateDto | undefined {
  if (!file) return undefined;
  const dto = new FileCreateDto();
  dto.userId = userId;
  dto.adminId = adminId ?? null;
  dto.file_name = file.filename;
  dto.url = file.path;
  return dto;
}
