import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from 'prisma/prisma.service';
import { FilesService } from 'src/files/files.service';
import { ExpFileCreateDto } from './dto/exp-file-create.dto';

@Injectable()
export class ExpFileService {
  private readonly logger = new Logger(ExpFileService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async getByUserId(userId: number) {
    try {
      const expFile = await this.prisma.exp_files.findFirst({
        where: { user: userId },
        orderBy: { create_date: 'desc' },
      });

      if (!expFile) {
        throw new NotFoundException('exp file not found');
      }

      return expFile;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async deleteByUserId(userId: number) {
    try {
      const expFile = await this.prisma.exp_files.findFirst({
        where: { user: userId },
        orderBy: { create_date: 'desc' },
      });

      if (!expFile || !expFile.url) {
        throw new NotFoundException('card not found');
      }

      await this.filesService.deleteFile(expFile.url);
      await this.prisma.exp_files.delete({
        where: { exp_file_id: expFile.exp_file_id },
      });
      return;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async create(dto: ExpFileCreateDto) {
    try {
      return await this.prisma.exp_files.create({ data: dto });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
