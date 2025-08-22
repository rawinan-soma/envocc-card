import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MinistriesService {
  private readonly logger = new Logger(MinistriesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getMinistries() {
    try {
      const ministries = await this.prisma.ministries.findMany();
      return ministries;
    } catch (error: any) {
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
