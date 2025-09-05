import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);
  constructor();
}
