import { PartialType, OmitType } from '@nestjs/mapped-types';
import { UserCreateDto } from 'src/user-auth/dto/user-create.dto';

export class UserUpdateDto extends PartialType(
  OmitType(UserCreateDto, ['username'] as const),
) {}
