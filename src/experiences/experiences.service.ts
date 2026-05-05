import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateExpDto } from './update-exp.dto';
import { SepExpCreateDto } from './create-exp.dto';

@Injectable()
export class ExperiencesService {
  logger = new Logger(ExperiencesService.name);
  constructor(private readonly prisma: PrismaService) {}

  private calculateExpYears(lastDate: Date, startDate: Date): number {
    let yearDiff = lastDate.getFullYear() - startDate.getFullYear();

    if (
      lastDate.getMonth() < startDate.getMonth() ||
      (lastDate.getMonth() === startDate.getMonth() &&
        lastDate.getDate() < startDate.getDate())
    ) {
      yearDiff--;
    }

    return yearDiff;
  }

  async getAllExperience(userId: number) {
    try {
      const exp = await this.prisma.experiences.findMany({
        where: { userId: userId },
      });
      if (exp.length === 0) {
        throw new NotFoundException('no experiences found for user');
      }
      return exp;
    } catch (err) {
      if (err instanceof NotFoundException) {
        return err;
      }
      this.logger.error(err);
      return new InternalServerErrorException('unexpected error');
    }
  }

  async editExperience(expId: number, dto: UpdateExpDto) {
    try {
      return await this.prisma.experiences.update({
        where: { exp_id: expId },
        data: dto,
      });
    } catch (err) {
      this.logger.error(err);
      return new InternalServerErrorException('unexpected error');
    }
  }

  async addExperinces(dto: SepExpCreateDto[]) {
    try {
      dto.map((i) => {
        i.exp_years = Number(this.calculateExpYears(i.exp_ldate, i.exp_fdate));
      });
      return await this.prisma.experiences.createMany({ data: dto });
    } catch (err) {
      this.logger.error(err);
      return new InternalServerErrorException('unexpected error');
    }
  }

  async deleteExperience(expId: number) {
    try {
      return await this.prisma.experiences.delete({ where: { exp_id: expId } });
    } catch (err) {
      this.logger.error(err);
      return new InternalServerErrorException('unexpected error');
    }
  }
}
