import { IsNumber } from 'class-validator';
import { ExpCreateDto } from 'src/user-auth/dto/exp-create.dto';

export class SepExpCreateDto extends ExpCreateDto {
  @IsNumber()
  userId: number;
}
