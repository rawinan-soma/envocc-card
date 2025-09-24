import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getAllPositions(orgId?: number) {
    try {
      // const nonExecutiveId = [201, 202, 203, 204, 205, 206, 207];
      if (!orgId) {
        return await this.prisma.positions.findMany({
          where: { orgId: null },
          select: { position_name: true, position_id: true },
        });
      }

      const executiveResponse = await this.prisma.positions.findFirst({
        where: { orgId: orgId },
        select: { position_name: true, position_id: true },
      });

      return {
        executive_id: executiveResponse?.position_id,
        executive_position_name: executiveResponse?.position_name,
      };
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  // async getNonExecutiveById(id: number) {
  //   try {
  //     const position = await this.prisma.positions.findUnique({
  //       where: { position_id: id },
  //     });

  //     return position;
  //   } catch (err) {
  //     this.logger.error(err);

  //     throw new InternalServerErrorException('something went wrong');
  //   }
  // }

  // async getAllPositionLevels(executive: boolean) {
  //   try {
  //     if (executive) {
  //       throw new BadRequestException('executive did not have levels');
  //     }

  //     const levels = await this.prisma.position_lvs.findMany({
  //       select: { position_lv_name: true, position_lv_id: true },
  //     });
  //     return levels;
  //   } catch (err) {
  //     this.logger.error(err);
  //     if (err instanceof BadRequestException) {
  //       throw err;
  //     }

  //     throw new InternalServerErrorException('something went wrong');
  //   }
  // }

  // async getPositionLevelById(id: number) {
  //   try {
  //     const level = await this.prisma.position_lvs.findUnique({
  //       where: { position_lv_id: id },
  //     });

  //     return level;
  //   } catch (err) {
  //     this.logger.error(err);
  //     throw new InternalServerErrorException('something went wrong');
  //   }
  // }
}
