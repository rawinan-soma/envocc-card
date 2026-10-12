import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export const REVERT_DELETABLE_FILES = ['photo', 'govcard', 'expfile'] as const;
export type RevertDeletableFile = (typeof REVERT_DELETABLE_FILES)[number];

export class RevertStatusDto {
  @IsNumber()
  current_status: number;

  @IsNumber()
  target_status: number;

  // Only used for a Revert to 1 or 6; missing or empty keeps every file.
  @IsOptional()
  @IsArray()
  @IsIn(REVERT_DELETABLE_FILES, { each: true })
  delete_files?: RevertDeletableFile[];

  @IsOptional()
  @IsString()
  description?: string;
}
