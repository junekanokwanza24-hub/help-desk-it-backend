import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAttachmentDto } from './dto/create-attachment.dto.js';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAttachmentDto) {
    return this.prisma.attachment.create({
      data: {
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        ticket: { connect: { id: dto.ticketId } },
        uploadedBy: { connect: { id: dto.uploadedById } },
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findByTicket(ticketId: string) {
    return this.prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOne(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }
    return attachment;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.attachment.delete({ where: { id } });
    return { id, deleted: true };
  }
}
