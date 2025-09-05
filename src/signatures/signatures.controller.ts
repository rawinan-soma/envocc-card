import { Controller } from '@nestjs/common';
import { SignaturesService } from './signatures.service';

@Controller('signatures')
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}
}
