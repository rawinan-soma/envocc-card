import { Controller } from '@nestjs/common';
import { PublicService } from './public.service';
import { FilesService } from 'src/files/files.service';

@Controller()
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly filesService: FilesService,
  ) {}
}
