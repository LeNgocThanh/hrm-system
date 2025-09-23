import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LeaveType, LeaveUnit } from '../common/leave-type.enum';


// Lặp lại SegmentDto để có ValidateIf riêng cho update
class UpdateSegmentDto {
  @IsEnum(LeaveUnit)
  unit!: LeaveUnit;

  // DAY
  @ValidateIf(o => o.unit === LeaveUnit.DAY)
  @Type(() => Date) @IsDate()
  @IsOptional()
  fromDate?: Date;

  @ValidateIf(o => o.unit === LeaveUnit.DAY)
  @Type(() => Date) @IsDate()
  @IsOptional()
  toDate?: Date;

  // HALF_DAY
  @ValidateIf(o => o.unit === LeaveUnit.HALF_DAY)
  @Type(() => Date) @IsDate()
  @IsOptional()
  date?: Date;

  @ValidateIf(o => o.unit === LeaveUnit.HALF_DAY)
  @IsIn(['AM', 'PM'])
  @IsOptional()
  slot?: 'AM'|'PM';

  // HOUR
  @ValidateIf(o => o.unit === LeaveUnit.HOUR)
  @Type(() => Date) @IsDate()
  @IsOptional()
  startAt?: Date;

  @ValidateIf(o => o.unit === LeaveUnit.HOUR)
  @Type(() => Date) @IsDate()
  @IsOptional()
  endAt?: Date;

  // Cho phép override loại phép từng segment (tùy chính sách)
  @IsOptional()
  @IsEnum(LeaveType)
  leaveTypeOverride?: LeaveType;
}

// Lưu ý: UpdateLeaveDto là "partial", nghĩa là trường nào không gửi thì giữ nguyên
export class UpdateLeaveDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(LeaveType)
  leaveType?: LeaveType;

  // Nếu gửi segments => sẽ THAY THẾ toàn bộ segments hiện có
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateSegmentDto)
  segments?: UpdateSegmentDto[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  attachmentIds?: string[];

  // Cho phép cập nhật người duyệt/ghi chú duyệt nếu cần (thường dùng DTO review riêng)
  @IsOptional()
  @IsMongoId()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  reviewNote?: string;

}
