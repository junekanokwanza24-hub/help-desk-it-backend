import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  ticketId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
