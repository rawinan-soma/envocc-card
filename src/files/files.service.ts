import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import {
  envocc_card_files,
  exp_files,
  gov_card_files,
  photos,
  seals,
  Prisma,
  request_files,

  // members,
} from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FileCreateDto } from './dto/file-create.dto';

interface MulterOptionsParams {
  extension: string[];
  size: number;
}

type FileModels =
  | 'envcard'
  | 'expfile'
  | 'govcard'
  | 'seal'
  | 'photo'
  | 'reqFile';

export type FileModelMap = {
  envcard: envocc_card_files;
  expfile: exp_files;
  govcard: gov_card_files;
  seal: seals;
  photo: photos;
  reqFile: request_files;

  // member: members;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ✅ ใช้ getter แทน field ปกติ
  private get modelMap() {
    return {
      envcard: this.prisma.envocc_card_files,
      expfile: this.prisma.exp_files,
      govcard: this.prisma.gov_card_files,
      seal: this.prisma.seals,
      photo: this.prisma.photos,
      reqFile: this.prisma.request_files,

      // member: this.prisma.members
    } satisfies Record<FileModels, any>;
  }

  getMulterOpitions({ extension, size }: MulterOptionsParams) {
    return {
      fileFilter: (req, file: Express.Multer.File, cb) => {
        const fileExt = extname(file.originalname).toLowerCase();

        if (!extension.includes(fileExt)) {
          return cb(new BadRequestException('unsupported file type'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: size,
      },
      storage: diskStorage({
        destination(req, file, callback) {
          callback(null, join(process.cwd(), 'assets'));
        },
        filename: (req, file, cb) => {
          const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${suffix}${ext}`);
        },
      }),
    };
  }

  async deleteFile(path: string) {
    try {
      await fs.unlink(path);
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'ENOENT') {
        throw new NotFoundException('file not found');
      } else {
        throw new InternalServerErrorException('cannot delete file');
      }
    }
  }

  async getFileByUserId<T extends keyof FileModelMap>(
    model: T,
    userId: number,
  ): Promise<FileModelMap[T]> {
    try {
      const delegate = this.modelMap[model] as {
        findFirst: (args: any) => Promise<FileModelMap[T] | null>;
      };

      const file = await delegate.findFirst({
        where: { user: userId },
        orderBy: { create_date: 'desc' },
      });

      if (!file) {
        throw new NotFoundException(`${model} not found`);
      }

      return file;
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request');
      }
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async deleteFileByUserId<T extends keyof FileModelMap>(
    model: T,
    userId: number,
  ) {
    try {
      const delegate = this.modelMap[model] as {
        findFirst: (args: any) => Promise<FileModelMap[T] | null>;
        delete: (args: any) => Promise<FileModelMap[T] | null>;
      };
      const file = await delegate.findFirst({
        where: { user: userId },
        orderBy: { create_date: 'desc' },
      });

      if (!file || !file.url) {
        throw new NotFoundException(`${model} not found`);
      }

      await this.deleteFile(file.url);

      await delegate.delete({ where: { id: file.id } });
      return;
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

  async createFile<T extends keyof FileModelMap>(
    model: T,
    data: FileCreateDto,
  ) {
    try {
      const delegate = this.modelMap[model] as {
        create: (args: any) => Promise<FileModelMap[T] | null>;
      };

      return await delegate.create({ data: data });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async txUploadFileForUser<T extends keyof FileModelMap>(
    model: T,
    data: FileCreateDto,
    tx: Prisma.TransactionClient,
  ) {
    try {
      const transactionModelMap = {
        envcard: tx.envocc_card_files,
        expfile: tx.exp_files,
        govcard: tx.gov_card_files,
        seal: tx.seals,
        photo: tx.photos,
        reqFile: tx.request_files,
      } satisfies Record<FileModels, any>;

      const delegate = transactionModelMap[model] as {
        create: (args: any) => Promise<FileModelMap[T] | null>;
      };

      return await delegate.create({ data: data });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
