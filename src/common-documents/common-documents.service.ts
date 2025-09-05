import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { DocumentCreateDto } from './dto/document-create.dto';
import { FilesService } from 'src/files/files.service';
import * as fs from 'fs';

@Injectable()
export class CommonDocumentsService {
  private readonly logger = new Logger(CommonDocumentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async getAllDocuments() {
    try {
      const documents = await this.prisma.documents.findMany();
      return documents;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async getDocumentById(id: number) {
    try {
      const document = await this.prisma.documents.findUnique({
        where: { id: id },
      });

      if (!document) {
        throw new NotFoundException('document not found');
      }

      return document;
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

  async createDocument(dto: DocumentCreateDto) {
    try {
      return await this.prisma.documents.create({ data: dto });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async deleteDocument(id: number) {
    try {
      const document = await this.prisma.documents.findUnique({
        where: { id: id },
      });

      if (!document || !document.url) {
        throw new NotFoundException('document not found');
      }
      fs.unlinkSync(document.url);
      await this.filesService.deleteFile(document.url);
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
}
