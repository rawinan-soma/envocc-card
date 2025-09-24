import { OrgLevel } from '@prisma/client';
import { IsEnum, IsNumber, IsString } from 'class-validator';

// enum OrgLevel {
//   MINISTRY = "MINISTRY",
//   DEPARTMENT = "DEPARTMENT",
//   REGION = "REGION",
//   PROVINCE = "PROVINCE",
//   UNIT = "UNIT",
// }

export class OrgCreateDto {
  @IsString()
  code: string;

  @IsString()
  name_th: string;

  @IsString()
  name_eng: string;

  @IsEnum(OrgLevel)
  level: OrgLevel;

  @IsNumber()
  provinceId: number;
}
