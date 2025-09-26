import { Controller, Req, UseGuards, Get, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateDto } from './dto/user-update.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuardUser)
  @Get('me')
  async getCurrentUserHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserById(Number(request.user.id));
  }

  @Patch('me')
  async updateUserHandler(
    @Req() request: RequestwithUserData,
    @Body() user: UserUpdateDto,
  ) {
    return this.usersService.updateUser(request.user.id, user);
  }

  @UseGuards(JwtAccessGuardUser)
  @Get('me/requests/form')
  async createRequestFormHandler(@Req() request: RequestwithUserData) {
    const id = request.user.id;
    return this.usersService.getUserRequestForm(id);
  }

  @Get('me/requests/exp')
  async createExpFormHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserPrintExpForm(request.user.id);
  }

  // @Post('me/govcard')
  // @UseInterceptors(
  //   FileInterceptor('govcard', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  // )
  // async createGovcardHandler(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Req() request: RequestwithUserData,
  // ) {
  //   const dto = this.createFileDtoMapper(
  //     request.user.id,
  //     file.filename,
  //     file.path,
  //   );
  //   const govcard = await this.filesService.createFile('govcard', dto);
  //   return { msg: 'govcard create', id: govcard?.id };
  // }

  // @Post('me/expfile')
  // @UseInterceptors(
  //   FileInterceptor('expfile', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  // )
  // async createExpHandler(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Req() request: RequestwithUserData,
  // ) {
  //   const dto = this.createFileDtoMapper(
  //     request.user.id,
  //     file.filename,
  //     file.path,
  //   );
  //   const expfile = await this.filesService.createFile('expfile', dto);
  //   return { msg: 'expfile create', id: expfile?.id };
  // }

  // @Post('me/photo')
  // @UseInterceptors(
  //   FileInterceptor('photo', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  // )
  // async createPhotosHandler(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Req() request: RequestwithUserData,
  // ) {
  //   const dto = this.createFileDtoMapper(
  //     request.user.id,
  //     file.filename,
  //     file.path,
  //   );
  //   const photo = await this.filesService.createFile('photo', dto);
  //   return { msg: 'photo create', id: photo?.id };
  // }
}
