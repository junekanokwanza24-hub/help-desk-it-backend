import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { QueryTicketDto } from './dto/query-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { TicketsService } from './tickets.service.js';
import { CurrentUser } from '../auth/current.user.decorator.js';
import type { RequestUser } from '../auth/current.user.decorator.js';
import { JwtAuthGuard } from '../auth/strategies/jwt.auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body('assignedToId') assignedToId: string) {
    return this.ticketsService.assign(id, assignedToId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
