import { BadRequestException } from '@nestjs/common';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

// `extension` is one list for every file field, or a list per field name when
// the fields differ. A field missing from the map accepts nothing.
export function getMulterOptions(
  extension: string[] | Record<string, string[]>,
  size: number,
): MulterModuleOptions {
  return {
    fileFilter: (req, file, cb) => {
      const fileExt = extname(file.originalname).toLowerCase();
      const allowed = Array.isArray(extension)
        ? extension
        : (extension[file.fieldname] ?? []);

      if (!allowed.includes(fileExt)) {
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
