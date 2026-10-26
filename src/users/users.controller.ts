import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CurrentUser } from '../auth/current.user.decorator.js';
import type { RequestUser } from '../auth/current.user.decorator.js';
import { JwtAuthGuard } from '../auth/strategies/jwt.auth.guard.js';

const assertAdmin = (user: RequestUser) => {
  if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
};

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // me routes ต้องอยู่ก่อน :id เสมอ
  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  changeMyPassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    assertAdmin(user);
    return this.usersService.findAll();
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    assertAdmin(user);
    return this.usersService.create(dto);
  }

  @Patch(':id/role')
  updateRole(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    assertAdmin(user);
    return this.usersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    assertAdmin(user);
    return this.usersService.remove(id);
  }
}
