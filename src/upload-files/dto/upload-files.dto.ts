// src/files/dto/file-upload.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File để upload' })
  file: any; // Đây là placeholder cho file, Multer sẽ xử lý nó

  @ApiProperty({
    description: 'ID của người dùng tải lên',
    example: 'user123',
    required: true,
  })
  uploadedBy: string;

  @ApiProperty({
    description: 'Loại tài nguyên (ví dụ: profile_picture, product_image)',
    example: 'profile_picture',
    required: false,
  })
  resourceType?: string;

  @ApiProperty({
    description: 'ID của đối tượng liên quan (ví dụ: user ID, product ID)',
    example: 'product456',
    required: false,
  })
  relatedId?: string;
}