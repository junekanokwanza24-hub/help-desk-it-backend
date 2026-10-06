import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Usage: create(@CurrentUser() user: RequestUser, @Body() dto: CreateTicketDto)
export interface RequestUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
