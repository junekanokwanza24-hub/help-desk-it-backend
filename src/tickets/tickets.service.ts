import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { QueryTicketDto } from './dto/query-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createdById: string, dto: CreateTicketDto) {
    if (!createdById) {
      throw new BadRequestException('createdById is required');
    }
    if (!dto.categoryId) {
      throw new BadRequestException('categoryId is required');
    }

    const ticket = await this.prisma.tickets.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
        department: dto.department,
        phoneNumber: dto.phoneNumber,
        reporterName: dto.reporterName,
        deviceName: dto.deviceName,
        category: { connect: { id: dto.categoryId } },
        createdBy: { connect: { id: createdById } },
        ...(dto.assignedToId && {
          assignedTo: { connect: { id: dto.assignedToId } },
        }),
      },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // ถ้าสร้าง ticket พร้อม assign เลย ก็แจ้งเตือนตั้งแต่ตอนสร้าง
    if (dto.assignedToId) {
      await this.notifyAssignment(ticket.id, dto.assignedToId, ticket.title);
    }

    return ticket;
  }

  async findAll(query: QueryTicketDto) {
    const {
      status,
      priority,
      categoryId,
      assignedToId,
      page = 1,
      limit = 20,
    } = query;

    const where = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(categoryId && { categoryId }),
      ...(assignedToId && { assignedToId }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tickets.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.tickets.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.tickets.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        comments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const existing = await this.findOne(id); // ตรวจว่ามีอยู่จริงก่อน + throw 404

    const statusTimestamps = this.resolveStatusTimestamps(dto.status);
    const { categoryId, assignedToId, ...rest } = dto;

    const ticket = await this.prisma.tickets.update({
      where: { id },
      data: {
        ...rest,
        ...statusTimestamps,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(assignedToId !== undefined && {
          assignedTo: assignedToId
            ? { connect: { id: assignedToId } }
            : { disconnect: true },
        }),
      },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // แจ้งเตือนเฉพาะตอนที่ assignedToId เปลี่ยนไปจากเดิม และมีค่าใหม่ (ไม่ใช่ unassign)
    const assigneeChanged =
      assignedToId !== undefined && assignedToId !== existing.assignedTo?.id;

    if (assigneeChanged && assignedToId) {
      await this.notifyAssignment(ticket.id, assignedToId, ticket.title);
    }

    return ticket;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tickets.delete({ where: { id } });
    return { id, deleted: true };
  }

  async assign(id: string, assignedToId: string) {
    const existing = await this.findOne(id);

    const ticket = await this.prisma.tickets.update({
      where: { id },
      data: { assignedTo: { connect: { id: assignedToId } } },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (assignedToId !== existing.assignedTo?.id) {
      await this.notifyAssignment(ticket.id, assignedToId, existing.title);
    }

    return ticket;
  }

  // สร้าง notification ให้คนที่ถูก assign — เรียกซ้ำได้จากหลายจุด (create/update/assign)
  private async notifyAssignment(
    ticketId: string,
    assignedToId: string,
    ticketTitle: string,
  ) {
    await this.notificationsService.create({
      message: `คุณได้รับมอบหมายงาน: "${ticketTitle}"`,
      userId: assignedToId,
      ticketId,
    });
  }

  // set resolvedAt/closedAt อัตโนมัติตาม status ที่เปลี่ยน
  private resolveStatusTimestamps(status?: TicketStatus) {
    if (!status) return {};
    if (status === TicketStatus.SUCCESS) return { resolvedAt: new Date() };
    if (status === TicketStatus.ABORTED) return { closedAt: new Date() };
    return {};
  }
}
