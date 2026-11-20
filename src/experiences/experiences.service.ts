import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { editPersonalData } from 'src/users/edit-personal-data';
import { UpdateExpDto } from './update-exp.dto';
import { ExpCreateDto } from 'src/user-auth/dto/exp-create.dto';
import { expYears } from './exp-years';

@Injectable()
export class ExperiencesService {
  logger = new Logger(ExperiencesService.name);
  constructor(private readonly prisma: PrismaService) {}

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

  async editExperience(userId: number, expId: number, dto: UpdateExpDto) {
    return this.editOwnExperiences(userId, (tx) =>
      tx.experiences.update({
        where: { exp_id: expId, userId },
        data: dto,
      }),
    );
  }

  async addExperinces(userId: number, dto: ExpCreateDto[]) {
    return this.editOwnExperiences(userId, (tx) =>
      tx.experiences.createMany({
        data: dto.map((i) => ({
          ...i,
          userId,
          exp_years: expYears(i.exp_fdate, i.exp_ldate),
        })),
      }),
    );
  }

  async deleteExperience(userId: number, expId: number) {
    return this.editOwnExperiences(userId, (tx) =>
      tx.experiences.delete({ where: { exp_id: expId, userId } }),
    );
  }

  private async editOwnExperiences<T>(
    userId: number,
    write: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await editPersonalData(this.prisma, userId, write);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('experience not found');
      }
      this.logger.error(err);
      throw new InternalServerErrorException('unexpected error');
    }
  }
}
