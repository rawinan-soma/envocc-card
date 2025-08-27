import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from 'prisma/prisma.service';
import { EnvCardCreateDto } from './dto/env-card-create.dto';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class EnvcardService {
  private readonly logger = new Logger(EnvcardService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async getByUserId(userId: number) {
    try {
      const envcard = await this.prisma.envocc_card_files.findFirst({
        where: { user: userId },
        orderBy: { create_date: 'desc' },
      });

      if (!envcard) {
        throw new NotFoundException('card not found');
      }

      return envcard;
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
      const envcard = await this.prisma.envocc_card_files.findFirst({
        where: { user: userId },
        orderBy: { create_date: 'desc' },
      });

      if (!envcard || !envcard.url) {
        throw new NotFoundException('card not found');
      }

      await this.filesService.deleteFile(envcard.url);
      await this.prisma.envocc_card_files.delete({
        where: { envocc_card_file_id: envcard.envocc_card_file_id },
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

  async create(dto: EnvCardCreateDto) {
    try {
      return await this.prisma.envocc_card_files.create({ data: dto });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
