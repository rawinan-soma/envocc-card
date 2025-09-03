import { Controller } from '@nestjs/common';
import { ReqFilesService } from './req-files.service';

@Controller('req-files')
export class ReqFilesController {
  constructor(private readonly reqFilesService: ReqFilesService) {}
}
