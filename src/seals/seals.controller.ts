import { Controller } from '@nestjs/common';
import { SealsService } from './seals.service';

@Controller('seals')
export class SealsController {
  constructor(private readonly sealsService: SealsService) {}
}
