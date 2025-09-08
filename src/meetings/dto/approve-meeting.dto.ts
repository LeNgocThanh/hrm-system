import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional } from 'class-validator';

export class ApproveMeetingDto {
  @ApiProperty({ enum: ['APPROVED','REJECTED'] })
  @IsString() @IsIn(['APPROVED','REJECTED']) decision: 'APPROVED'|'REJECTED';

  @ApiPropertyOptional({ description: 'Ghi chú phê duyệt/từ chối' })
  @IsOptional() @IsString() note?: string;
}
