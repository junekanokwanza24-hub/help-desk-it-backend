import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

import { AttachmentsService } from './attachments.service.js';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = randomUUID();
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('ticketId') ticketId: string,
    @Body('uploadedById') uploadedById: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ticketId) throw new BadRequestException('ticketId is required');
    if (!uploadedById)
      throw new BadRequestException('uploadedById is required');

    return this.attachmentsService.create({
      ticketId,
      uploadedById,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
    });
  }

  @Get('ticket/:ticketId')
  findByTicket(@Param('ticketId') ticketId: string) {
    return this.attachmentsService.findByTicket(ticketId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
