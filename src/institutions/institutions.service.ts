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
          institution_name_th: { contains: institution_name_th },
        },
        select: {
          institution_id: true,
          institution_name_th: true,
          departments: {
            select: {
              department_name_th: true,
              ministries: { select: { ministry_name_th: true } },
            },
          },
          epositions: {
            select: { eposition_name_th: true, eposition_id: true },
          },
        },
      });

      return institution;
    } catch (error: any) {
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async getInstitutionById(institution_id: number) {
    try {
      const institution = await this.prisma.institutions.findFirst({
        where: { institution_id: institution_id },
        select: {
          institution_id: true,
          institution_name_th: true,
          departments: {
            select: {
              department_name_th: true,
              ministries: { select: { ministry_name_th: true } },
            },
          },
          epositions: {
            select: { eposition_name_th: true, eposition_id: true },
          },
        },
      });

      return institution;
    } catch (error: any) {
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
