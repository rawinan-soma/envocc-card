import { BadRequestException } from '@nestjs/common';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export function getMulterOptions(
  extension: string[],
  size: number,
): MulterModuleOptions {
  return {
    fileFilter: (req, file, cb) => {
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
