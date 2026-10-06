import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects a route: requires a valid `Authorization: Bearer <token>` header.
// On success, populates `req.user` from JwtStrategy.validate().
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
