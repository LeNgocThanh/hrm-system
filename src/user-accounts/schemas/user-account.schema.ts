import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserAccountDocument = UserAccount & Document;

@Schema({ timestamps: true })
export class UserAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'locked', 'suspended'] })
  status: string; // Trạng thái tài khoản đăng nhập

  @Prop()
  lastLoginAt?: Date;

  @Prop({ default: 0 })
  loginAttempts: number;

  @Prop()
  lockedUntil?: Date;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret?: string;

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

export const UserAccountSchema = SchemaFactory.createForClass(UserAccount);
