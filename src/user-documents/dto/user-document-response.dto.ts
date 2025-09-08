// src/user-documents/dto/user-document-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { DocTypeEnum } from '../enums/doc-type.enum';

export class UserDocumentResponseDto {
  @ApiProperty({ description: 'ID duy nhất của tài liệu người dùng' })
  id: string;

  @ApiProperty({ description: 'ID của người dùng liên quan' })
  userId: string;

  @ApiProperty({ description: 'Loại tài liệu', enum: DocTypeEnum })
  docType: DocTypeEnum;

  @ApiProperty({ description: 'Mô tả chi tiết khi docType là "other"', required: false })
  otherDocTypeDescription?: string; // Thêm trường này

  @ApiProperty({ description: 'ID của file đã upload' })
  fileId: string;

  @ApiProperty({ description: 'Mô tả tóm tắt nội dung văn bản (tùy chọn)', required: false })
  description?: string;

  @ApiProperty({ description: 'Trạng thái hoạt động của tài liệu' })
  isActive: boolean;

  @ApiProperty({ description: 'Thời điểm tạo tài liệu' })
  createdAt: Date;

  @ApiProperty({ description: 'Thời điểm cập nhật tài liệu', required: false })
  updatedAt?: Date;
}