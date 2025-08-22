import { Controller } from '@nestjs/common';
import { MinistriesService } from './ministries.service';

@Controller('ministries')
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}
}
