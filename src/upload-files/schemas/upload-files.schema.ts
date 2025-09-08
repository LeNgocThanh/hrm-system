// src/files/schemas/file.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Định nghĩa FileDocument là một Document của Mongoose
export type UploadFileDocument = UploadFile & Document;

// Định nghĩa Schema cho File
@Schema()
export class UploadFile {
  @Prop({ required: true })
  originalName: string; // Tên file gốc khi người dùng upload

  @Prop({ required: true, unique: true })
  filename: string; // Tên file đã được lưu trên server (duy nhất)

  @Prop({ required: true })
  mimetype: string; // Loại MIME của file (ví dụ: image/jpeg)

  @Prop({ required: true })
  size: number; // Kích thước file tính bằng byte

  @Prop({ required: true })
  path: string; // Đường dẫn tương đối hoặc tuyệt đối của file trên server

  @Prop({ nullable: true })
  publicUrl?: string; // URL công khai của file nếu được lưu trữ trên CDN/Cloud Storage

  @Prop({ required: true })
  uploadedBy: string; // ID của người dùng đã tải lên file

  @Prop({ default: Date.now })
  uploadedAt: Date; // Thời điểm file được tải lên

  @Prop({ default: Date.now })
  updatedAt: Date; // Thời điểm thông tin file được cập nhật

  @Prop({
    type: String,
    enum: ['pending', 'active', 'archived', 'deleted'],
    default: 'active',
  })
  status: string; // Trạng thái của file

  @Prop()
  resourceType?: string; // Loại tài nguyên mà file này được sử dụng (ví dụ: 'profile_picture', 'product_image')

  @Prop()
  relatedId?: string; // ID của đối tượng liên quan (ví dụ: User ID, Product ID)

  @Prop()
  hash?: string; // Mã hash của file (ví dụ: SHA-256) để kiểm tra tính toàn vẹn hoặc tránh trùng lặp
}

// Tạo Schema từ class File
export const UploadFileSchema = SchemaFactory.createForClass(UploadFile);