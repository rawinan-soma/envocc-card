import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UserCreateDto } from 'src/user-auth/dto/user-create.dto';
import { UserExpCreateDto } from 'src/user-auth/dto/user-exp-create.dto';

class UserUpdateInternalDto extends PartialType(
  OmitType(UserCreateDto, ['username'] as const),
) {}

export class UserUpdateDto extends PartialType(
  OmitType(UserExpCreateDto, ['user'] as const),
) {
  @ValidateNested()
  @Type(() => UserUpdateInternalDto)
  @IsOptional()
  user?: UserUpdateInternalDto;
}
