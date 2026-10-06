import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAttachmentDto {
  @IsNotEmpty()
  @IsString()
  fileUrl!: string;

  @IsNotEmpty()
  @IsString()
  fileName!: string;

  @IsNotEmpty()
  @IsString()
  ticketId!: string;

  @IsNotEmpty()
  @IsString()
  uploadedById!: string;
}
