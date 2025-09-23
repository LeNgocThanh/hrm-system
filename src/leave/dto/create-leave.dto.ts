// dto/create-leave.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDate, IsEnum, IsIn, IsMongoId, IsOptional, IsString,
  ValidateNested, ValidateIf
} from 'class-validator';
import { LeaveType, LeaveUnit } from '../common/leave-type.enum';


class SegmentDto {
  @IsEnum(LeaveUnit)
  unit!: LeaveUnit;

  // DAY
  @ValidateIf(o => o.unit === LeaveUnit.DAY)
  @Type(() => Date) @IsDate()
  fromDate?: Date;

  @ValidateIf(o => o.unit === LeaveUnit.DAY)
  @Type(() => Date) @IsDate()
  toDate?: Date;

  // HALF_DAY
  @ValidateIf(o => o.unit === LeaveUnit.HALF_DAY)
  @Type(() => Date) @IsDate()
  date?: Date;

  @ValidateIf(o => o.unit === LeaveUnit.HALF_DAY)
  @IsIn(['AM', 'PM'])
  slot?: 'AM'|'PM';

  // HOUR
  @ValidateIf(o => o.unit === LeaveUnit.HOUR)
  @Type(() => Date) @IsDate()
  startAt?: Date;

  @ValidateIf(o => o.unit === LeaveUnit.HOUR)
  @Type(() => Date) @IsDate()
  endAt?: Date;

  @IsOptional()
  @IsEnum(LeaveType)
  leaveTypeOverride?: LeaveType;
}

export class CreateLeaveDto {
  @IsMongoId()
  userId!: string;

  @IsEnum(LeaveType)
  leaveType!: LeaveType; // default cho cả đơn

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SegmentDto)
  segments!: SegmentDto[];

  @IsOptional() @IsString()
  reason?: string;

  @IsOptional() @IsArray()
  @IsMongoId({ each: true })
  attachmentIds?: string[];
}
