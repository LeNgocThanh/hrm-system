// src/user-documents/dto/update-user-document.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDocumentDto } from './create-user-document.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { DocTypeEnum } from '../enums/doc-type.enum';

export class UpdateUserDocumentDto extends PartialType(CreateUserDocumentDto) {
  // Ghi đè hoặc thêm các thuộc tính nếu cần, ví dụ để thay đổi mô tả Swagger
  @ApiProperty({
    description: 'Loại tài liệu',
    enum: DocTypeEnum,
    example: DocTypeEnum.CV,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocTypeEnum, { message: 'docType phải là một giá trị hợp lệ' })
  docType?: DocTypeEnum; // Đảm bảo là optional

  @ApiProperty({
    description: 'Mô tả chi tiết khi docType là "other"',
    required: false,
    example: 'Hợp đồng lao động',
  })
  @ValidateIf(o => o.docType === DocTypeEnum.OTHER) // Logic validation vẫn được giữ
  @IsNotEmpty({ message: 'otherDocTypeDescription không được để trống khi docType là "other"' })
  @IsString({ message: 'otherDocTypeDescription phải là chuỗi' })
  otherDocTypeDescription?: string; // Đảm bảo là optional
}