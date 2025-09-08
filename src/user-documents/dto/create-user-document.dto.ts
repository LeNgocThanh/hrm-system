// src/user-documents/dto/create-user-document.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { DocTypeEnum } from '../enums/doc-type.enum';

export class CreateUserDocumentDto {
  @ApiProperty({
    description: 'ID của người dùng liên quan',
    example: '60c72b2f9b1e8b001c8e4d7a',
  })
  @IsMongoId({ message: 'userId phải là một MongoId hợp lệ' })
  userId: string;

  @ApiProperty({
    description: 'Loại tài liệu',
    enum: DocTypeEnum,
    example: DocTypeEnum.IDENTIFICATION,
  })
  @IsEnum(DocTypeEnum, { message: 'docType phải là một giá trị hợp lệ' })
  docType: DocTypeEnum;

  @ApiProperty({
    description: 'Mô tả chi tiết khi docType là "other"',
    required: false,
    example: 'Giấy phép lái xe',
  })
  @ValidateIf(o => o.docType === DocTypeEnum.OTHER) // Chỉ validate nếu docType là 'other'
  @IsNotEmpty({ message: 'otherDocTypeDescription không được để trống khi docType là "other"' })
  @IsString({ message: 'otherDocTypeDescription phải là chuỗi' })
  otherDocTypeDescription?: string; // Đặt là optional vì nó chỉ bắt buộc trong điều kiện

  @ApiProperty({
    description: 'ID của file đã upload từ bảng File',
    example: '60c72b2f9b1e8b001c8e4d7b',
  })
  @IsMongoId({ message: 'fileId phải là một MongoId hợp lệ' })
  fileId: string;

  @ApiProperty({
    description: 'Mô tả tóm tắt nội dung văn bản (tùy chọn)',
    required: false,
    example: 'Bản sao chứng minh thư nhân dân',
  })
  @IsOptional()
  @IsString({ message: 'description phải là chuỗi' })
  description?: string;

  @ApiProperty({
    description: 'Trạng thái hoạt động của tài liệu',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;
}