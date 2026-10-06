import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCommentDto) {
    return this.prisma.ticketComment.create({
      data: dto,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findByTicket(ticketId: string) {
    return this.prisma.ticketComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOne(id: string) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    return comment;
  }

  async update(id: string, dto: UpdateCommentDto) {
    await this.findOne(id);
    return this.prisma.ticketComment.update({
      where: { id },
      data: dto,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.ticketComment.delete({ where: { id } });
    return { id, deleted: true };
  }
}
