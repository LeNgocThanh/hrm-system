import { IsNotEmpty, IsString, IsDate } from 'class-validator';

export class CreateLogDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsDate()
  timestamp: Date;

  @IsString()
  source?: string;
}
