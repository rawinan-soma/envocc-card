import { PartialType } from '@nestjs/mapped-types';
import { MemeberCreateDto } from './create-member.dto';

export class MemberUpdateDto extends PartialType(MemeberCreateDto) {}
