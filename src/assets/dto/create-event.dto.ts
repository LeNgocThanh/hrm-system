import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString, IsDateString, IsNumber, IsObject } from 'class-validator';
import { AssetEventType } from '../schemas/asset-event.schema';

export class CreateAssetEventDto {
  @ApiProperty({ enum: AssetEventType })
  @IsEnum(AssetEventType)
  type: AssetEventType;

  @ApiProperty({ example: '2025-08-18' })
  @IsDateString()
  eventDate: string;

  @ApiPropertyOptional({ description: 'Người thực hiện' })
  @IsOptional()
  @IsMongoId()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Từ người dùng (transfer/return)' })
  @IsOptional()
  @IsMongoId()
  fromUserId?: string;

  @ApiPropertyOptional({ description: 'Đến người dùng (assign/transfer)' })
  @IsOptional()
  @IsMongoId()
  toUserId?: string;

  @ApiPropertyOptional({ description: 'Chi phí sửa chữa/tiền thu thanh lý', example: 500000 })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ description: 'Biên bản đính kèm' })
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Biên bản đính kèm' })
  @IsOptional()
  @IsMongoId()
  documents?: string;  

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}