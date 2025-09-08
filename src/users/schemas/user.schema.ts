import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop()
  birthDay: Date;

  @Prop({ required: true })
  gender: string;

  @Prop({ sparse: true })
  email: string;

  @Prop({ sparse: true })
  phone?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'terminated'] })
  employeeStatus: string; // Trạng thái nhân viên (khác với account status)

  @Prop()
  details: string;

  // Audit fields
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  editedBy?: Types.ObjectId;

  @Prop()
  createTime?: Date;

  @Prop()
  updateTime?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
