// import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

export class EnvCardCreateDto {
  user: number;

  @IsString()
  file_card_name: string;

  url: string;
}
