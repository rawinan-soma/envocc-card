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
import { fileDto } from './dto/file-create.dto';
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

  @Post('me/envcard')
  @UseInterceptors(
    FileInterceptor('envcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createEnvCardHandler(
    @UploadedFile(fileRequired('envcard')) file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = fileDto(file, request.user.id);

    const envcard = await this.filesService.createFile('envcard', dto);
    return { msg: 'envcard create', id: envcard?.id };
  }

  @Post('me/photo')
  @UseInterceptors(PHOTO_UPLOAD)
  async createPhotosHandler(
    @UploadedFile(fileRequired('photo')) file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const dto = fileDto(file, request.user.id);
    const photo = await this.filesService.createFile('photo', dto);
    return { msg: 'photo create', id: photo?.id };
  }

  @Put('me/photo')
  @UseInterceptors(PHOTO_UPLOAD)
  async replacePhotoHandler(
    @UploadedFile(fileRequired('photo')) file: Express.Multer.File,
    @Req() request: RequestwithUserData,
  ) {
    const photo = await this.filesService.replacePhoto(
      request.user.id,
      fileDto(file, request.user.id),
    );
    return { msg: 'photo replaced', id: photo?.id };
  }

  // Step 3 upload: needs the user to be at Request Status 1 or 3.
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
    const userId = request.user.id;
    return await this.filesService.uploadStepThree('user', userId, {
      govcard: fileDto(files?.govCard?.[0], userId),
      expfile: fileDto(files?.experienceForm?.[0], userId),
      photo: fileDto(files?.photo?.[0], userId),
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
