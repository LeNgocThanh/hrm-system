import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { SessionCode } from '../common/session-code.enum';

export class ShiftSessionDto {
  @ApiProperty({ enum: SessionCode })
  @IsEnum(SessionCode)
  code!: SessionCode;

  @ApiProperty({ example: '08:30', description: 'Định dạng HH:mm (24h)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'start phải là HH:mm' })
  start!: string;

  @ApiProperty({ example: '12:00', description: 'Định dạng HH:mm (24h)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'end phải là HH:mm' })
  end!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean = true;

  @ApiPropertyOptional({ description: 'Phút cho phép vào trễ', example: 10 })
  @IsOptional()
  graceInMins?: number;

  @ApiPropertyOptional({ description: 'Phút cho phép ra sớm', example: 10 })
  @IsOptional()
  graceOutMins?: number;  

  @ApiPropertyOptional({ description: 'Thời gian nghỉ giữa phiên (phút)', example: 0 })
  @IsOptional()
  breakMinutes?: number;

  @ApiPropertyOptional({ description: 'Phút cho phép vào sớm trước start', example: 15 })
  @IsOptional()
  maxCheckInEarlyMins?: number;

  @ApiPropertyOptional({ description: 'Phút cho phép ra muộn sau end', example: 15 })
  @IsOptional()
  maxCheckOutLateMins?: number;
}
