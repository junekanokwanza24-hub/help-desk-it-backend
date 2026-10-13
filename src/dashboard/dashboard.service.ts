import { Injectable } from '@nestjs/common';
import { TicketStatus, PriorityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js'; // ปรับ path ให้ตรงโปรเจกต์

const OPEN = [TicketStatus.PENDING, TicketStatus.IN_PROGRESS];
const DAY = 24 * 60 * 60 * 1000;
const BKK_OFFSET = 7 * 60 * 60 * 1000;
const dayKey = (d: Date) =>
  new Date(d.getTime() + BKK_OFFSET).toISOString().slice(0, 10);

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(days: number) {
    const now = new Date();
    const since = new Date(now.getTime() - days * DAY);

    const [
      byStatus,
      byPriority,
      categories,
      byDepartment,
      byAssignee,
      unassigned,
      highOpen,
      createdRecent,
      resolvedRecent,
      resolvedForAvg,
      recent,
      oldestOpen,
    ] = await Promise.all([
      this.prisma.tickets.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.tickets.groupBy({
        by: ['priority'],
        where: { status: { in: OPEN } },
        _count: { _all: true },
      }),
      this.prisma.category.findMany({
        select: { name: true, _count: { select: { tickets: true } } },
      }),
      this.prisma.tickets.groupBy({
        by: ['department'],
        where: { department: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.tickets.groupBy({
        by: ['assignedToId'],
        where: { status: { in: OPEN }, assignedToId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.tickets.count({
        where: { status: { in: OPEN }, assignedToId: null },
      }),
      this.prisma.tickets.count({
        where: { status: { in: OPEN }, priority: PriorityType.HIGH },
      }),
      this.prisma.tickets.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.tickets.findMany({
        where: { resolvedAt: { gte: since } },
        select: { resolvedAt: true },
      }),
      this.prisma.tickets.findMany({
        where: { resolvedAt: { not: null } },
        orderBy: { resolvedAt: 'desc' },
        take: 500,
        select: { createdAt: true, resolvedAt: true },
      }),
      this.prisma.tickets.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.tickets.findMany({
        where: { status: { in: OPEN } },
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
    ]);

    // totals
    const s = Object.fromEntries(
      byStatus.map((x) => [x.status, x._count._all]),
    );
    const totals = {
      all: byStatus.reduce((n, x) => n + x._count._all, 0),
      pending: s.PENDING ?? 0,
      inProgress: s.IN_PROGRESS ?? 0,
      success: s.SUCCESS ?? 0,
      aborted: s.ABORTED ?? 0,
      unassigned,
      highOpen,
    };

    // avg resolution (hours)
    const durations = resolvedForAvg
      .filter((t) => t.resolvedAt)
      .map((t) => t.resolvedAt!.getTime() - t.createdAt.getTime());
    const avgResolutionHours = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length / 3_600_000
      : null;

    // trend (bucket by Asia/Bangkok day)
    const buckets = new Map<string, { created: number; resolved: number }>();
    for (let i = days - 1; i >= 0; i--) {
      buckets.set(dayKey(new Date(now.getTime() - i * DAY)), {
        created: 0,
        resolved: 0,
      });
    }
    createdRecent.forEach((t) => {
      const b = buckets.get(dayKey(t.createdAt));
      if (b) b.created++;
    });
    resolvedRecent.forEach((t) => {
      const b = buckets.get(dayKey(t.resolvedAt!));
      if (b) b.resolved++;
    });
    const trend = [...buckets].map(([date, v]) => ({ date, ...v }));

    // workload
    const users = await this.prisma.user.findMany({
      where: { id: { in: byAssignee.map((a) => a.assignedToId!) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const workload = byAssignee
      .map((a) => {
        const u = users.find((x) => x.id === a.assignedToId);
        return {
          name: u ? `${u.firstName} ${u.lastName}` : 'Unknown',
          count: a._count._all,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totals,
      avgResolutionHours,
      trend,
      byCategory: categories
        .map((c) => ({ name: c.name, count: c._count.tickets }))
        .sort((a, b) => b.count - a.count),
      byDepartment: byDepartment.map((d) => ({
        name: d.department!,
        count: d._count._all,
      })),
      byPriority: byPriority.map((p) => ({
        priority: p.priority,
        count: p._count._all,
      })),
      workload,
      recent: recent.map((t) => ({ ...t, category: t.category.name })),
      oldestOpen,
    };
  }
}
