import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId, IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetDocType } from '../schemas/asset-document.schema';

export class CreateAssetDocumentDto {
  @ApiProperty({ description: 'ID của tài sản liên quan', example: '667a7d8c2c3d0f209a2c3b11' })
  @IsMongoId()
  @IsNotEmpty()
  assetId: string;

  @ApiPropertyOptional({ description: 'ID của người dùng sở hữu tài liệu', example: '667a7d8c2c3d0f209a2c3b12' })
  @IsOptional()
  @IsMongoId()
  ownerUserId?: string;

  @ApiProperty({ description: 'Loại tài liệu', enum: AssetDocType, example: AssetDocType.HANDOVER })
  @IsEnum(AssetDocType)
  type: AssetDocType;

  @ApiPropertyOptional({ description: 'Tiêu đề tài liệu', example: 'Biên bản bàn giao Laptop' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'ID của tệp tin đã được upload', example: '667a7d8c2c3d0f209a2c3b13' })
  @IsMongoId()
  @IsNotEmpty()
  fileId: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm', example: 'Biên bản có chữ ký số' })
  @IsOptional()
  @IsString()
  note?: string;
}