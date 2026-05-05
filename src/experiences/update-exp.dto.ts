import { PartialType } from '@nestjs/mapped-types';
import { ExpCreateDto } from 'src/user-auth/dto/exp-create.dto';

export class UpdateExpDto extends PartialType(ExpCreateDto) {}
