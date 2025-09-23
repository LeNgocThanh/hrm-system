import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LeaveType, LeaveUnit } from '../common/leave-type.enum';

export class QueryLeaveDto {
  // Lọc theo người xin
  @IsOptional()
  @IsMongoId()
  userId?: string;

  // Lọc theo người duyệt
  @IsOptional()
  @IsMongoId()
  reviewerId?: string;

  // Lọc theo trạng thái
  @IsOptional()
  @IsIn(['pending','approved','rejected','cancelled'])
  status?: 'pending'|'approved'|'rejected'|'cancelled';

  // Lọc theo loại phép cấp đơn (segments có thể override; tuỳ chính sách muốn lọc theo override thì dùng join/aggregate)
  @IsOptional()
  @IsEnum(LeaveType)
  leaveType?: LeaveType;

  // Lọc theo đơn vị nghỉ trong bất kỳ segment
  @IsOptional()
  @IsEnum(LeaveUnit)
  unit?: LeaveUnit;

  // Lọc theo khoảng thời gian: bất kỳ segment nào GIAO với [from,to] (UTC hoặc TZ chuẩn của hệ thống)
  @IsOptional()
  @Type(() => Date) @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date) @IsDate()
  to?: Date;

  // Tìm theo từ khoá (lý do)
  @IsOptional()
  @IsString()
  q?: string;

  // Phân trang
  @IsOptional()
  @Type(() => Number) @IsNumber() @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number) @IsNumber() @Min(1)
  limit?: number = 20;
  
  @IsOptional()
  @IsString()
  sort?: 'startAsc'|'startDesc'|'createdDesc'|'createdAsc'|'updatedDesc'|'updatedAsc';
}
