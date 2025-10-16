import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
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
    @Param('file') file: Express.Multer.File,
    @Body() data: DocumentCreateDto,
  ) {
    return await this.commondocService.createDocument({
      ...data,
      doc_file: file.filename,
      url: file.path,
    });
  }

  @Delete('document/:docId')
  async deleteDocumentHandler(@Param() docId: number) {
    return await this.commondocService.deleteDocument(docId);
  }
}
