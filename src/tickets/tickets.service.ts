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
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
        floor: dto.floor,
        type: dto.type,
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
  async findAll(query: QueryTicketDto, user: { id: string; role: string }) {
    const {
      status,
      priority,
      type,
      categoryId,
      assignedToId,
      department,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = query;

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException(
        'dateFrom must be before or equal to dateTo',
      );
    }

    // +07:00 = เวลาไทย กันวันเหลื่อมจาก UTC
    const createdAt: Prisma.DateTimeFilter | undefined =
      dateFrom || dateTo
        ? {
            ...(dateFrom && {
              gte: new Date(`${dateFrom.slice(0, 10)}T00:00:00.000+07:00`),
            }),
            ...(dateTo && {
              lte: new Date(`${dateTo.slice(0, 10)}T23:59:59.999+07:00`),
            }),
          }
        : undefined;

    const filters: Prisma.TicketsWhereInput = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(assignedToId && { assignedToId }),
      ...(department && { department }),
      ...(createdAt && { createdAt }),
    };

    const isAdmin = user.role === 'ADMIN';

    const where: Prisma.TicketsWhereInput = isAdmin
      ? filters
      : {
          AND: [
            filters,
            { OR: [{ createdById: user.id }, { assignedToId: user.id }] },
          ],
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

    const statusTimestamps = this.resolveStatusTimestamps(
      dto.status,
      existing.status,
    );
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
  private readonly logger = new Logger(TicketsService.name);
  // สร้าง notification ให้คนที่ถูก assign — เรียกซ้ำได้จากหลายจุด (create/update/assign)
  private async notifyAssignment(
    ticketId: string,
    assignedToId: string,
    ticketTitle: string,
  ) {
    try {
      await this.notificationsService.create({
        message: `คุณได้รับมอบหมายงาน: "${ticketTitle}"`,
        userId: assignedToId,
        ticketId,
      });
    } catch (e) {
      this.logger.warn(`Notification failed for ticket ${ticketId}: ${e}`);
    }
  }

  // set resolvedAt/closedAt อัตโนมัติตาม status ที่เปลี่ยน
  private resolveStatusTimestamps(next?: TicketStatus, prev?: TicketStatus) {
    if (!next || next === prev) return {}; // ไม่เปลี่ยนสถานะ → ไม่แตะ
    return {
      resolvedAt: next === TicketStatus.SUCCESS ? new Date() : null,
      closedAt: next === TicketStatus.ABORTED ? new Date() : null,
    };
  }
}
