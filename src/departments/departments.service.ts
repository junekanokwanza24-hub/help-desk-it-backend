import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js'; // ปรับ path ให้ตรงโปรเจกต์
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const [departments, counts] = await Promise.all([
      this.prisma.department.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.tickets.groupBy({
        by: ['department'],
        where: { department: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map(counts.map((c) => [c.department, c._count._all]));

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      ticketCount: countMap.get(d.name) ?? 0,
    }));
  }

  async create(dto: CreateDepartmentDto) {
    try {
      const d = await this.prisma.department.create({
        data: { name: dto.name.trim() },
      });
      return { id: d.id, name: d.name, ticketCount: 0 };
    } catch (e) {
      this.handleError(e);
    }
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found');

    const name = dto.name!.trim();

    try {
      // Tickets.department เป็น string จึงต้อง rename ตั๋วเก่าตามใน transaction เดียวกัน
      const [updated, renamed] = await this.prisma.$transaction([
        this.prisma.department.update({ where: { id }, data: { name } }),
        this.prisma.tickets.updateMany({
          where: { department: existing.name },
          data: { department: name },
        }),
      ]);
      return { id: updated.id, name: updated.name, ticketCount: renamed.count };
    } catch (e) {
      this.handleError(e);
    }
  }

  private handleError(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002')
        throw new ConflictException('Department name already exists');
      if (e.code === 'P2025')
        throw new NotFoundException('Department not found');
    }
    throw e;
  }
}
