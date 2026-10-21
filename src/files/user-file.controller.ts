import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Req,
  // UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileModelMap, FilesService } from './files.service';
import { FileCreateDto } from './dto/file-create.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { ValidatedUser } from 'src/user-auth/validated-user.decorator';

const PHOTO_UPLOAD = FileInterceptor(
  'photo',
  getMulterOptions(['.jpg', '.png'], 10 * 1024 * 1024),
);

const STEP_THREE_UPLOAD = FileFieldsInterceptor(
  [
    { name: 'govCard', maxCount: 1 },
    { name: 'experienceForm', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
  ],
  getMulterOptions(
    {
      govCard: ['.pdf'],
      experienceForm: ['.pdf'],
      photo: ['.jpg', '.png'],
    },
    10 * 1024 * 1024,
  ),
);

const fileRequired = (field: string) =>
  new ParseFilePipe({
    exceptionFactory: () => new BadRequestException(`${field} is required`),
  });

@ValidatedUser()
@Controller('users')
export class UserFileController {
  constructor(private readonly filesService: FilesService) {}

  private createFileDtoMapper(user: number, filename: string, url: string) {
    const dto = new FileCreateDto();
    dto.userId = user;
    dto.file_name = filename;
    dto.url = url;

    return dto;
  }

  @Post('me/envcard')
  @UseInterceptors(
    FileInterceptor('envcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createEnvCardHandler(
    @UploadedFile(fileRequired('envcard')) file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = this.createFileDtoMapper(
      request.user.id,
      file.filename,
      file.path,
    );

    const envcard = await this.filesService.createFile('envcard', dto);
    return { msg: 'envcard create', id: envcard?.id };
  }

  @Post('me/photo')
  @UseInterceptors(PHOTO_UPLOAD)
  async createPhotosHandler(
    @UploadedFile(fileRequired('photo')) file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = this.createFileDtoMapper(
      request.user.id,
      file.filename,
      file.path,
    );
    const photo = await this.filesService.createFile('photo', dto);
    return { msg: 'photo create', id: photo?.id };
  }

  @Put('me/photo')
  @UseInterceptors(PHOTO_UPLOAD)
  async replacePhotoHandler(
    @UploadedFile(fileRequired('photo')) file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const photo = await this.filesService.replacePhoto(request.user.id, {
      file_name: file.filename,
      url: file.path,
    });
    return { msg: 'photo replaced', id: photo?.id };
  }

  // Step 3 upload: needs the user to be at Request Status 3.
  @Post('me/files')
  @UseInterceptors(STEP_THREE_UPLOAD)
  async uploadFilesHandler(
    @UploadedFiles()
    files: {
      govCard?: Express.Multer.File[];
      experienceForm?: Express.Multer.File[];
      photo?: Express.Multer.File[];
    },
    @Req() request: RequestwithUserData,
  ) {
    const toDto = (file?: Express.Multer.File[]) =>
      file?.[0] &&
      this.createFileDtoMapper(request.user.id, file[0].filename, file[0].path);

    return await this.filesService.uploadStepThree('user', request.user.id, {
      govcard: toDto(files?.govCard),
      expfile: toDto(files?.experienceForm),
      photo: toDto(files?.photo),
    });
  }

  @Get('me/files/:file')
  async getUsersFilesHandler(
    @Param('file') file: keyof FileModelMap,
    @Req() request: RequestwithUserData,
  ) {
    return await this.filesService.getFileByUserId(file, request.user.id);
  }
}
