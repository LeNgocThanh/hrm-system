import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Min, IsNotEmpty, IsDateString } from 'class-validator';
import { CompensationType, OvertimeKind } from '../common/overTime.enum';

export class QueryOvertimeDto {
  @IsOptional() @IsMongoId()
  userId?: string;

  @IsOptional() @IsMongoId()
  reviewerId?: string;

  @IsOptional() @IsIn(['pending','approved','rejected','cancelled'])
  status?: 'pending'|'approved'|'rejected'|'cancelled';

  @IsOptional() @IsEnum(CompensationType)
  compensation?: CompensationType;

  @IsOptional() @IsEnum(OvertimeKind)
  kind?: OvertimeKind;

  // Khoảng thời gian giao nhau với BẤT KỲ segment
  @IsOptional() @Type(() => Date) @IsDate()
  from?: Date;

  @IsOptional() @Type(() => Date) @IsDate()
  to?: Date;

  // search lý do
  @IsOptional() @IsString()
  q?: string;

  // phân trang
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  limit?: number = 20;

  @IsOptional() @IsString()
  sort?: 'startAsc'|'startDesc'|'createdDesc'|'createdAsc'|'updatedDesc'|'updatedAsc';
}

export class CheckConflictDto {
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  startAt: Date;

  @IsDateString()
  endAt: Date;

  refId?: string; // khi update thì truyền vào để loại trừ chính nó
}
