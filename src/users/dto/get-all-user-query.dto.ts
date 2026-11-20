import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { REQUEST_TYPES } from 'src/request/request-types';

enum Statuses {
  ongoing = 'ongoing',
  activated = 'activated',
  suspended = 'suspended',
}

export class GetUsersPageQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @Min(1)
  page?: number = 1;

  @IsString()
  @IsOptional()
  search_term?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsIn(Object.keys(REQUEST_TYPES).map(Number))
  request_type?: number;
}

export class GetAllUserQueryDto extends GetUsersPageQueryDto {
  @IsEnum(Statuses)
  status: Statuses;
}
