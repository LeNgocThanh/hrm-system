// src/files/dto/file-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({ description: 'ID duy nhất của file' })
  id: string;

  @ApiProperty({ description: 'Tên file gốc' })
  originalName: string;

  @ApiProperty({ description: 'Tên file đã lưu trên server' })
  filename: string;

  @ApiProperty({ description: 'Loại MIME của file' })
  mimetype: string;

  @ApiProperty({ description: 'Kích thước file (byte)' })
  size: number;

  @ApiProperty({ description: 'Đường dẫn lưu trữ file trên server' })
  path: string;

  @ApiProperty({ description: 'URL công khai của file (nếu có)', required: false })
  publicUrl?: string;

  @ApiProperty({ description: 'ID của người dùng tải lên' })
  uploadedBy: string;

  @ApiProperty({ description: 'Thời điểm tải lên' })
  uploadedAt: Date;

  @ApiProperty({ description: 'Thời điểm cập nhật thông tin file' })
  updatedAt: Date;

  @ApiProperty({ description: 'Trạng thái của file (active, deleted...)', enum: ['pending', 'active', 'archived', 'deleted'] })
  status: string;

  @ApiProperty({ description: 'Loại tài nguyên', required: false })
  resourceType?: string;

  @ApiProperty({ description: 'ID đối tượng liên quan', required: false })
  relatedId?: string;

  @ApiProperty({ description: 'Mã hash của file', required: false })
  hash?: string;
}