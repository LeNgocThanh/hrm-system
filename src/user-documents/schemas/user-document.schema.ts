// src/user-documents/schemas/user-document.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DocTypeEnum } from '../enums/doc-type.enum';

export type UserDocumentDocument = UserDocument & Document;

@Schema({ timestamps: true })
export class UserDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(DocTypeEnum), // Đảm bảo bao gồm 'other'
    required: true,
  })
  docType: DocTypeEnum;

  // Thêm trường mới để lưu mô tả khi docType là 'other'
  @Prop({ required: false }) // Là tùy chọn, chỉ bắt buộc khi docType là 'other'
  otherDocTypeDescription?: string;

  @Prop({ type: Types.ObjectId, ref: 'File', required: true })
  fileId: Types.ObjectId;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserDocumentSchema = SchemaFactory.createForClass(UserDocument);