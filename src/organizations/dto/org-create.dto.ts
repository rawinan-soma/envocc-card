import { IsNumber, IsOptional, IsString } from 'class-validator';

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

  @IsNumber()
  @IsOptional()
  provinceId?: number;
}
