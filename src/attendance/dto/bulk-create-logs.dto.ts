import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsString, ValidateNested } from 'class-validator';

export class LogItemDto {
  @IsString()
  userId!: string;

  // Cho phép chuỗi thời gian ISO (từ FE ghép date+time -> ISO)
  @IsString()
  timestamp!: string; // ISO string
}

export class CreateManyLogsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LogItemDto)
  items!: LogItemDto[];
}
