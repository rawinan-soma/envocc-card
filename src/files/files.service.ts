/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { envocc_card_files, exp_files, gov_card_files } from '@prisma/client';

interface MulterOptionsParams {
  extension: string[];
  size: number;
}

type FileModels =
  | 'envcard'
  | 'expfile'
  | 'govcard'
  | 'requestfile'
  | 'seal'
  | 'photo';

type FileModelMap = {
  envcard: envocc_card_files;
  expfile: exp_files;
  govcard: gov_card_files;
};

@Injectable()
export class FilesService {
  getMulterOpitions({ extension, size }: MulterOptionsParams) {
    return {
      fileFilter: (req, file: Express.Multer.File, cb) => {
        const fileExt = extname(file.originalname).toLowerCase();

        if (!extension.includes(fileExt)) {
          return cb(new BadRequestException('unsupported file type'), false);
        }
        cb(null, true);
      },
      limit: {
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
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'ENOENT') {
        throw new NotFoundException('file not found');
      } else {
        throw error;
      }
    }
  }
}
