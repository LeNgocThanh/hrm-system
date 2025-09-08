import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';

export class AssignAssetDto {
  @ApiProperty({ description: 'ID người nhận tài sản', example: '667a7d8c2c3d0f209a2c3b11' })
  @IsMongoId()
  toUserId: string;

  @ApiProperty({ description: 'Ngày bàn giao', example: '2025-08-18' })
  @IsDateString()
  handoverDate: string;

  @ApiPropertyOptional({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ 
    type: [String],
    description: 'Mảng ID của các tài liệu (biên bản bàn giao, v.v.)',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  documents?: string[];
}