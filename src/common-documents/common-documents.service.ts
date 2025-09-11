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
    } catch (err) {
      this.logger.error(err);
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
    } catch (err) {
      this.logger.error(err);
      if (err instanceof NotFoundException) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async createDocument(dto: DocumentCreateDto) {
    try {
      return await this.prisma.documents.create({ data: dto });
    } catch (err) {
      this.logger.error(err);
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
    } catch (err) {
      this.logger.error(err);
      if (err instanceof NotFoundException) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
}
