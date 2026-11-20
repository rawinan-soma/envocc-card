import { NotFoundException, PipeTransform } from '@nestjs/common';
import { FILE_KINDS, FileModelMap } from './files.service';

export class ParseFileKindPipe implements PipeTransform<
  string,
  keyof FileModelMap
> {
  transform(value: string): keyof FileModelMap {
    const kind = FILE_KINDS.find((k) => k === value);
    if (!kind) {
      throw new NotFoundException(`no file kind ${value}`);
    }
    return kind;
  }
}
