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
import { BloodGroup, EngNamePrefix, ThaiNamePrefix } from './users.enum';

export class UserCreateDto {
  // Required fields
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsEnum(ThaiNamePrefix)
  pname_th: ThaiNamePrefix;

  @IsString()
  pname_other_th: string;

  @IsString()
  fname_th: string;

  @IsString()
  lname_th: string;

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

  @IsNumber()
  nationality: number;

  @IsEnum(BloodGroup)
  blood: BloodGroup;

  @IsString()
  @Matches(/^0[0-9]{8}$/, { message: 'Invalid work number' })
  work_number: string;

  @IsString()
  @Matches(/^0[0-9]{9}$/, { message: 'Invalid private number' })
  private_number: string;

  @IsString()
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @IsString()
  house_number1: string;

  @IsNumber()
  moo1: number;

  @IsString()
  alley1: string;

  @IsString()
  road1: string;

  @IsNumber()
  province1: number;

  @IsNumber()
  amphures1: number;

  @IsNumber()
  districts1: number;

  @IsNumber()
  zip_code1: number;

  @IsString()
  house_number2: string;

  @IsString()
  moo2: string;

  @IsString()
  alley2: string;

  @IsString()
  road2: string;

  @IsNumber()
  province2: number;

  @IsNumber()
  amphures2: number;

  @IsNumber()
  district2: number;

  @IsNumber()
  zip_code2: number;

  @IsNumber()
  institution: number;

  @IsNumber()
  eposition: number;

  @IsNumber()
  position: number;

  @IsNumber()
  position_lv: number;

  @IsNumber()
  e_learning: number;

  @IsBoolean()
  approve: boolean;
}
