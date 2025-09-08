import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsNumber, IsObject, IsMongoId } from 'class-validator';
import { AssetStatus, AssetType } from '../schemas/asset.schema';

export class CreateAssetDto {
  @ApiProperty({ example: 'TS-0001', description: 'Mã tài sản nội bộ' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Laptop Dell Latitude 5440', description: 'Tên tài sản' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: AssetType, default: AssetType.EQUIPMENT, description: 'Loại tài sản' })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiProperty({ enum: AssetStatus, default: AssetStatus.IN_STOCK, description: 'tình trạng "lưu kho", "đã bàn giao"...' })
  @IsEnum(AssetStatus)
  status: AssetType;

  @ApiPropertyOptional({ example: '5440', description: 'Model/mã hàng' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'SN123456789', description: 'Số seri' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: 25000000, description: 'Giá mua' })
  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @ApiPropertyOptional({ example: 'VND', description: 'Đơn vị tiền tệ' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2025-08-01', description: 'Ngày mua' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 'FPT Trading', description: 'Nhà cung cấp' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 'Kho Hà Nội', description: 'Vị trí/kho lưu trữ' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Ghi chú về tài sản', description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;
  
  @ApiPropertyOptional({ description: 'Metadata bổ sung (tags, cấu hình...)' })
  @IsOptional()
  @IsObject()
  metadata?: object;

  @ApiPropertyOptional({ example: 'userId123', description: 'ID người đang giữ/tài sản được giao cho ai (nếu có)' })
  @IsOptional()
  @IsMongoId()
  currentHolderId?: string;
}