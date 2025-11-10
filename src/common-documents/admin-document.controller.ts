import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommonDocumentsService } from './common-documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { getMulterOptions } from 'src/shared/file-multer-options';
import { DocumentCreateDto } from './dto/document-create.dto';
import { JwtAccessGuardAdmin } from 'src/admin-auth/jwt-access.guard';

@UseGuards(JwtAccessGuardAdmin)
@Controller('admins')
export class AdminDocumentController {
  constructor(private readonly commondocService: CommonDocumentsService) {}

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('document', getMulterOptions(['.pdf'], 10 * 1024 * 1024)),
  )
  async createdDocumentHandler(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: DocumentCreateDto,
  ) {
    data.filename = file.filename;
    data.url = file.path;
    // console.log(data);
    return await this.commondocService.createDocument({
      ...data,
    });
  }

  @Delete('documents/:docId')
  async deleteDocumentHandler(@Param('docId', ParseIntPipe) docId: number) {
    return await this.commondocService.deleteDocument(docId);
  }
}
