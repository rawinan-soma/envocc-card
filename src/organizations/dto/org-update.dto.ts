import { PickType } from '@nestjs/mapped-types';
import { OrgCreateDto } from './org-create.dto';

export class OrgUpdateDto extends PickType(OrgCreateDto, [
  'code',
  'name_eng',
  'name_th',
] as const) {}
