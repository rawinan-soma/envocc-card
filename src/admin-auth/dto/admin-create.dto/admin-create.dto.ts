import { IsEmail, IsNumber, IsString, Matches } from 'class-validator';

export class AdminCreateDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  pname: string;

  @IsString()
  fname: string;

  @IsString()
  lname: string;

  @IsString()
  @Matches(/^0[0-9]{9}$/)
  private_number: string;

  @IsString()
  @Matches(/^0[0-9]{8}$/)
  work_number: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsNumber()
  positionId: number;

  @IsNumber()
  positionLvId: number;

  @IsNumber()
  orgId: number;
}
