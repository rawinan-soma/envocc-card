import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { CommonDocumentsService } from './common-documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from 'src/files/files.service';
import { DocumentCreateDto } from './dto/document-create.dto';

@Controller('common-documents')
export class CommonDocumentsController {
  constructor(
    private readonly commonDocumentsService: CommonDocumentsService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'document',
      new FilesService().getMulterOpitions({
        extension: ['.pdf'],
        size: 10 * 1024 * 1024,
      }),
    ),
  )
  async createDocumentHandler(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: DocumentCreateDto,
  ) {
    const document = await this.commonDocumentsService.createDocument({
      ...data,
      doc_file: file.filename,
      url: file.path,
    });

    return { msg: 'uploaded successfully', document_id: document.doc_id };
  }

  @Get()
  async getAllDocumentsHandler() {
    return this.commonDocumentsService.getAllDocuments();
  }

  @Get(':id')
  async getDocumentByIdHandler(@Param('id', ParseIntPipe) id: number) {
    return await this.commonDocumentsService.getDocumentById(id);
  }

  @Delete(':id')
  async deleteDocumentById(@Param('id', ParseIntPipe) id: number) {
    return await this.commonDocumentsService.deleteDocument(id);
  }
}
