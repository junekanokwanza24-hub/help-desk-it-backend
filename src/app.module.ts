import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { AttachmentsModule } from './attachments/attachments.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    AuthModule,
    UsersModule,
    TicketsModule,
    CategoriesModule,
    AttachmentsModule,
    CommentsModule,
    CategoriesModule,
    TicketsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
