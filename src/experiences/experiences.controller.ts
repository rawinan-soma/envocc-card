import { Controller } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';

@Controller('experieces')
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}
}
