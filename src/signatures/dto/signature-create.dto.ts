import { IsOptional, IsString } from 'class-validator';

export class SignatureCreateDto {
  @IsString()
  sign_person_pname: string;

  @IsString()
  sign_person_name: string;

  @IsString()
  sign_person_lname: string;

  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  admin?: number;
}
