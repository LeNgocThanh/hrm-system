import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IsDateString, IsOptional } from 'class-validator';

export type UserAssignmentDocument = UserAssignment & Document;

@Schema({ timestamps: true })
export class UserAssignment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ unique: true, sparse: true })
  userCode?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Position' })
  positionId?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Role', default: [] })
  roleIds: Types.ObjectId[];

  @Prop({ default: false })
  isPrimary: boolean; // Có phải vị trí chính của user không

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  timeIn: Date;

  @Prop({ type: Date })
  timeOut?: Date;

  @Prop({ type: String, default: 'fullTime' })
  workType: string; // Loại hình làm việc: fullTime, halftime, remote

  @Prop()
  Details?: string; // Thông tin bổ sung về phân công công việc để dự phòng

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

export const UserAssignmentSchema = SchemaFactory.createForClass(UserAssignment);
