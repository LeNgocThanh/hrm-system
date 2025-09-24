import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CompensationType } from '../common/overTime.enum';
import { OvertimeSegmentDto } from './segment.dto';

export class UpdateOvertimeDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(CompensationType)
  compensation?: CompensationType;

  // Nếu gửi segments → THAY THẾ toàn bộ
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OvertimeSegmentDto)
  segments?: OvertimeSegmentDto[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  attachmentIds?: string[];
}
