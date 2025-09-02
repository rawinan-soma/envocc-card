import {
  IsString,
  IsEmail,
  IsBoolean,
  IsDate,
  IsNumber,
  Matches,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EngNamePrefix, ThaiNamePrefix, BloodGroup } from './users.enum';

export class UserCreateDto {
  // Required fields

  @IsString()
  cid: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  @IsEnum(ThaiNamePrefix)
  pname_th: ThaiNamePrefix;

  @IsString()
  pname_other_th: string;

  @IsString()
  fname_th: string;

  @IsString()
  lname_th: string;

  @IsString()
  @IsEnum(EngNamePrefix)
  pname_en: EngNamePrefix;

  @IsString()
  pname_other_en: string;

  @IsString()
  fname_en: string;

  @IsString()
  lname_en: string;

  @IsDate()
  @Type(() => Date)
  birthday: Date;

  @IsString()
  nationality: string;

  @IsEnum(BloodGroup)
  blood: BloodGroup;

  @IsString()
  work_number: string;

  @IsString()
  @Matches(/^0[0-9]{9}$/, { message: 'Invalid private number' })
  private_number: string;

  @IsString()
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @IsString()
  house_number1: string;

  @Type(() => Number)
  moo1?: number | null;

  @IsString()
  alley1?: string | null;

  @IsString()
  road1?: string | null;

  @IsNumber()
  @Type(() => Number)
  province1: number;

  @IsNumber()
  @Type(() => Number)
  amphures1: number;

  @IsNumber()
  @Type(() => Number)
  district1: number;

  @IsNumber()
  @Type(() => Number)
  zip_code1: number;

  @IsString()
  house_number2: string;

  @Type(() => Number)
  moo2?: number | null;

  @IsString()
  alley2?: string | null;

  @IsString()
  road2?: string | null;

  @IsNumber()
  @Type(() => Number)
  province2: number;

  @IsNumber()
  @Type(() => Number)
  amphures2: number;

  @IsNumber()
  @Type(() => Number)
  district2: number;

  @IsNumber()
  @Type(() => Number)
  zip_code2: number;

  @IsNumber()
  @Type(() => Number)
  institution: number;

  @IsNumber()
  @Type(() => Number)
  eposition: number;

  @IsNumber()
  @Type(() => Number)
  position: number;

  @IsNumber()
  @Type(() => Number)
  position_lv: number;

  @IsNumber()
  @Type(() => Number)
  e_learning: number;

  @IsBoolean()
  approve: boolean;
}
