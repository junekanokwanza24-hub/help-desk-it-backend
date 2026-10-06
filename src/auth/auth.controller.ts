import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(
    @Body()
    signInDto: {
      email: string;
      password: string;
    },
  ) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  // POST /auth/register
  @Post('register')
  register(
    @Body()
    registerDto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      'USER',
      registerDto.firstName,
      registerDto.lastName,
    );
  }

  // POST /auth/register/admin
  @Post('register/admin')
  registerAdmin(
    @Body()
    registerDto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      'ADMIN',
      registerDto.firstName,
      registerDto.lastName,
    );
  }
}
