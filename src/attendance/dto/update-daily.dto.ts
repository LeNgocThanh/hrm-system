import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { AttendanceStatus } from '../common/attendance-status.enum';
import {WorkShiftType} from '../common/work-shift-type.enum';

export class UpdateDailyDto {
  @IsOptional()
  checkIn?: Date;

  @IsOptional()
  checkOut?: Date;

  @IsOptional()
  workShiftType?: string;

  @IsOptional()
  @IsNumber()
  workedMinutes?: number;

  @IsOptional()
  @IsNumber()
  hourWork?: number;

  @IsOptional()
  @IsNumber()
  workedCheckIn?: number;

  @IsOptional()
  @IsNumber()
  lateMinutes?: number;

  @IsOptional()
  @IsNumber()
  earlyLeaveMinutes?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  editNote?: string;
}
