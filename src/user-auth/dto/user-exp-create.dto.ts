import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UserCreateDto } from './user-create.dto';
import { ExpCreateDto } from './exp-create.dto';

export class UserExpCreateDto {
  @ValidateNested()
  @Type(() => UserCreateDto)
  user: UserCreateDto;

  @ValidateNested({ each: true })
  @Type(() => ExpCreateDto)
  experiences: ExpCreateDto[];
}
