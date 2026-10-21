import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import {
  addStatusEntry,
  canReplacePhoto,
  latestStatusEntry,
  lockUser,
} from 'src/request/status-history';
import {
  envocc_card_files,
  exp_files,
  gov_card_files,
  photos,
  // seals,
  Prisma,
  request_files,

  // members,
} from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FileCreateDto } from './dto/file-create.dto';

type FileModels =
  | 'envcard'
  | 'expfile'
  | 'govcard'
  // | 'seal'
  | 'photo'
  | 'reqFile';

export type FileModelMap = {
  envcard: envocc_card_files;
  expfile: exp_files;
  govcard: gov_card_files;
  // seal: seals;
  photo: photos;
  reqFile: request_files;

  // member: members;
};

type StepThreeFile = 'govcard' | 'reqFile' | 'expfile' | 'photo';

interface StepThreeRule {
  files: readonly StepThreeFile[];
  required: readonly StepThreeFile[];
  // Request Statuses the upload may start from; undefined = any.
  from?: readonly number[];
}

const STEP_THREE_RULES = {
  admin: { files: ['govcard', 'reqFile', 'expfile'], required: ['govcard'] },
  user: {
    files: ['govcard', 'expfile', 'photo'],
    required: ['govcard', 'expfile'],
    from: [3],
  },
} satisfies Record<'admin' | 'user', StepThreeRule>;

export type StepThreeUploader = keyof typeof STEP_THREE_RULES;

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
      // seal: this.prisma.seals,
      photo: this.prisma.photos,
      reqFile: this.prisma.request_files,

      // member: this.prisma.members
    } satisfies Record<FileModels, any>;
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
        where: { userId: userId },
        orderBy: { create_date: 'desc' },
      });

      if (!file) {
        throw new NotFoundException('file(s) not found');
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

  async listEnvcardFiles(userId?: number) {
    try {
      return await this.prisma.envocc_card_files.findMany({
        where: { userId },
        orderBy: [{ create_date: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          userId: true,
          filename: true,
          url: true,
          create_date: true,
        },
      });
    } catch (err) {
      this.logger.error(err);
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
        where: { userId: userId },
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
        findFirst: (args: any) => Promise<FileModelMap[T] | null>;
        create: (args: any) => Promise<FileModelMap[T] | null>;
        // delete: (args: any) => Promise<FileModelMap[T] | null>;
      };

      const file = await delegate.findFirst({
        where: { userId: data.userId },
        orderBy: { create_date: 'desc' },
      });

      if (file) {
        await fs.unlink(data.url);
        throw new BadRequestException('user already has file(s)');
      }

      return await delegate.create({
        data: {
          filename: data.file_name,
          url: data.url,
          userId: data.userId,
        },
      });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async replacePhoto(userId: number, data: FileCreateDto) {
    let swapped: { photo: photos | null; oldPaths: string[] };
    try {
      swapped = await this.prisma.$transaction(async (tx) => {
        // Holds off status writers and other replaces for this user until the
        // swap commits, so the status read below is still true when we write.
        await lockUser(tx, userId);
        const current = await latestStatusEntry(tx, userId);
        if (!current || !canReplacePhoto(current.request_status)) {
          throw new ForbiddenException(
            'photo can be replaced only at request status 1, 2 or 3',
          );
        }

        return {
          oldPaths: await this.txDeleteFilesForUser(['photo'], userId, tx),
          photo: await this.txUploadFileForUser('photo', data, tx),
        };
      });
    } catch (err) {
      // multer stored the upload before this ran, so a failed swap removes it.
      await this.deleteFilesFromDisk([data.url]);
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }

    await this.deleteFilesFromDisk(swapped.oldPaths);
    return swapped.photo;
  }

  // Step 3. Each document replaces the user's existing one(s) of that type.
  // A required type the user already has may be left out. Files the rule does
  // not list are ignored and removed from disk with the rest on failure.
  async uploadStepThree(
    uploader: StepThreeUploader,
    userId: number,
    uploads: Partial<Record<StepThreeFile, FileCreateDto>>,
  ) {
    const rule: StepThreeRule = STEP_THREE_RULES[uploader];
    const uploaded = Object.values(uploads).flatMap((dto) =>
      dto ? [dto.url] : [],
    );
    let replaced: string[];
    try {
      replaced = await this.prisma.$transaction(async (tx) => {
        if ((await lockUser(tx, userId)).length === 0) {
          throw new NotFoundException('user not found');
        }
        const current = await latestStatusEntry(tx, userId);
        if (rule.from) {
          if (!current || !rule.from.includes(current.request_status)) {
            throw new ForbiddenException(
              `documents can be uploaded only at request status ${rule.from.join(', ')}`,
            );
          }
        }

        const replaced: string[] = [];
        for (const model of rule.files) {
          const upload = uploads[model];
          if (upload) {
            replaced.push(
              ...(await this.txDeleteFilesForUser([model], userId, tx)),
            );
            await this.txUploadFileForUser(model, upload, tx);
          } else if (
            rule.required.includes(model) &&
            (await this.txCountFilesForUser(model, userId, tx)) === 0
          ) {
            throw new BadRequestException(`${model} is required`);
          }
        }

        await addStatusEntry(tx, {
          userId,
          status: 4,
          requestType: current?.request_type ?? 1,
          from: current?.request_status ?? null,
        });

        return replaced;
      });
    } catch (err) {
      await this.deleteFilesFromDisk(uploaded);
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }

    await this.deleteFilesFromDisk(replaced);
  }

  private txModelMap(tx: Prisma.TransactionClient) {
    return {
      envcard: tx.envocc_card_files,
      expfile: tx.exp_files,
      govcard: tx.gov_card_files,
      // seal: tx.seals,
      photo: tx.photos,
      reqFile: tx.request_files,
    } satisfies Record<FileModels, any>;
  }

  async txUploadFileForUser<T extends keyof FileModelMap>(
    model: T,
    data: FileCreateDto,
    tx: Prisma.TransactionClient,
  ) {
    try {
      const delegate = this.txModelMap(tx)[model] as {
        create: (args: any) => Promise<FileModelMap[T] | null>;
      };

      // photos has no adminId column: Prisma skips undefined but rejects null.
      return await delegate.create({
        data: {
          userId: data.userId,
          adminId: data.adminId ?? undefined,
          filename: data.file_name,
          url: data.url,
        },
      });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  // Deletes the rows only; returns the paths so the caller can remove them
  // from disk with deleteFilesFromDisk once the transaction has committed.
  async txDeleteFilesForUser(
    models: readonly (keyof FileModelMap)[],
    userId: number,
    tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    const paths: string[] = [];
    for (const model of models) {
      const delegate = this.txModelMap(tx)[model] as {
        findMany: (args: any) => Promise<FileModelMap[typeof model][]>;
        deleteMany: (args: any) => Promise<unknown>;
      };

      const files = await delegate.findMany({ where: { userId: userId } });
      await delegate.deleteMany({ where: { userId: userId } });

      paths.push(...files.flatMap((file) => (file.url ? [file.url] : [])));
    }

    return paths;
  }

  async txCountFilesForUser<T extends keyof FileModelMap>(
    model: T,
    userId: number,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const delegate = this.txModelMap(tx)[model] as {
      count: (args: any) => Promise<number>;
    };

    return delegate.count({ where: { userId: userId } });
  }

  // Best effort: a file that is already gone or can't be removed is logged,
  // not thrown, since the rows pointing at it are already gone.
  async deleteFilesFromDisk(paths: string[]) {
    for (const path of paths) {
      try {
        await fs.unlink(path);
      } catch (err) {
        this.logger.warn(`cannot delete file ${path}: ${String(err)}`);
      }
    }
  }
}
