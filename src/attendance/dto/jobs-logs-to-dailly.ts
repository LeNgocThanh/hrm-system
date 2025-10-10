import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { WorkShiftType } from '../common/work-shift-type.enum';

export class RunLogsToDailySmartDto {
  @ApiPropertyOptional({
    description: 'ID người dùng. Nếu bỏ trống: chạy cho TẤT CẢ users',
    example: '6899c2a19fa487d473cc41f6',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Loại hình làm việc. Mặc định REGULAR',
    example: 'REGULAR',
  })
  @IsOptional()
  @IsEnum(WorkShiftType)
  shiftType?: WorkShiftType;

  @ApiPropertyOptional({
    description:
      "Ngày bắt đầu (YYYY-MM-DD). Nếu cả from/to đều bỏ trống: tự động chạy THÁNG TRƯỚC.",
    example: '2025-09-01',
    format: 'date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from phải có dạng YYYY-MM-DD',
  })
  from?: string;

  @ApiPropertyOptional({
    description:
      "Ngày kết thúc (YYYY-MM-DD). Nếu chỉ có from, to sẽ mặc định = from.",
    example: '2025-09-30',
    format: 'date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to phải có dạng YYYY-MM-DD',
  })
  to?: string;
}
