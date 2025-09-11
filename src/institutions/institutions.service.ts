import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllInstitutions(institution_name_th: string) {
    try {
      const institution = await this.prisma.institutions.findMany({
        where: {
          name_th: { contains: institution_name_th },
        },
        select: {
          id: true,
          name_th: true,
          departments: {
            select: {
              name_th: true,
              ministries: { select: { name_th: true } },
            },
          },
          epositions: {
            select: { eposition_name_th: true, eposition_id: true },
          },
        },
      });

      return institution;
    } catch (err: any) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async getInstitutionById(institution_id: number) {
    try {
      const institution = await this.prisma.institutions.findFirst({
        where: { id: institution_id },
        select: {
          id: true,
          name_th: true,
          departments: {
            select: {
              name_th: true,
              ministries: { select: { name_th: true } },
            },
          },
          epositions: {
            select: { eposition_name_th: true, eposition_id: true },
          },
        },
      });

      return institution;
    } catch (err: any) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
