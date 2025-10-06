import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { AttendanceStatus } from '../common/attendance-status.enum';
import {WorkShiftType} from '../common/work-shift-type.enum';

export class UpdateDailyDto {
  @IsOptional()
  checkIn?: Date;

  @IsOptional()
  checkOut?: Date;

  @IsOptional()
  workShiftType?: WorkShiftType;

  @IsOptional()
  @IsNumber()
  workedMinutes?: number;

  @IsOptional()
  @IsNumber()
  lateMinutes?: number;

  @IsOptional()
  @IsNumber()
  earlyLeaveMinutes?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}
