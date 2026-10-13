import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  getStats(@Query('days') days?: string) {
    const n = Math.min(Math.max(parseInt(days ?? '14', 10) || 14, 1), 90);
    return this.service.getStats(n);
  }
}
