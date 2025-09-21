import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getAllPositions(nonExecutive: boolean) {
    try {
      if (nonExecutive) {
        const validId = [201, 202, 203, 204, 205, 206, 207];
        return this.prisma.positions.findMany({
          where: { position_id: { in: validId } },
        });
      }

      return this.prisma.positions;
    } catch (err) {}
  }
}
