import {
  Controller,
  Req,
  UseGuards,
  Get,
  Patch,
  Body,
  Post,
  ParseIntPipe,
  ParseArrayPipe,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuardUser } from 'src/user-auth/jwt-access.guard';
import type { RequestwithUserData } from 'src/user-auth/request-user-interface';
import { UserUpdateInternalDto } from './dto/user-update.dto';
import { UpdateExpDto } from 'src/experiences/update-exp.dto';
import { ExperiencesService } from 'src/experiences/experiences.service';
import { SepExpCreateDto } from 'src/experiences/create-exp.dto';

// @UseGuards(JwtAccessGuardUser)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly expService: ExperiencesService,
  ) {}

  @UseGuards(JwtAccessGuardUser)
  @Get('me')
  async getCurrentUserHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserById(Number(request.user.id));
  }
  @UseGuards(JwtAccessGuardUser)
  @Patch('me')
  async updateUserHandler(
    @Req() request: RequestwithUserData,
    @Body() user: UserUpdateInternalDto,
  ) {
    return this.usersService.updateUser(request.user.id, user);
  }

  // No @ValidatedUser(): unapproved users read the profile they edit here.
  @UseGuards(JwtAccessGuardUser)
  @Get('me/requests/form')
  async getRequestFormHandler(@Req() request: RequestwithUserData) {
    return this.usersService.getUserRequestForm(request.user.id);
  }

  // No @ValidatedUser(): unapproved users can open the form; the client turns
  // off printing until is_validate is true.
  @UseGuards(JwtAccessGuardUser)
  @Get('me/requests/exp')
  async getExpFormHandler(@Req() request: RequestwithUserData) {
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

  @UseGuards(JwtAccessGuardUser)
  @Patch('me/experiences/:expId')
  async editExperienceHandler(
    @Body() dto: UpdateExpDto,
    @Param('expId', ParseIntPipe) expId: number,
  ) {
    return this.expService.editExperience(expId, dto);
  }

  @UseGuards(JwtAccessGuardUser)
  @Get('me/experiences')
  async getExperienceHandler(@Req() request: RequestwithUserData) {
    const user = request.user.id;
    return this.expService.getAllExperience(user);
  }

  @UseGuards(JwtAccessGuardUser)
  @Post('me/experiences')
  async addExperienceHandler(
    @Body(new ParseArrayPipe({ items: SepExpCreateDto }))
    dto: SepExpCreateDto[],
  ) {
    return this.expService.addExperinces(dto);
  }

  @UseGuards(JwtAccessGuardUser)
  @Delete('me/experiences/:expId')
  async deleteExperienceHandler(@Param('expId', ParseIntPipe) expId: number) {
    return this.expService.deleteExperience(expId);
  }
}
