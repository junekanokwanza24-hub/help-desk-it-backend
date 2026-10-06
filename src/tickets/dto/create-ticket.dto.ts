import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { TicketStatus, PriorityType } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsEnum(PriorityType)
  priority?: PriorityType;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  // Reporter contact info, for IT staff doing remote (VNC) support
  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  reporterName!: string;

  @IsString()
  @IsNotEmpty()
  deviceName!: string;
}
