import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

enum Statuses {
  ongoing = 'ongoing',
  activated = 'activated',
  suspended = 'suspended',
}

export class GetAllUserQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @Min(1)
  page?: number = 1;

  @IsString()
  @IsOptional()
  search_term?: string;

  @IsEnum(Statuses)
  status: Statuses;
}
