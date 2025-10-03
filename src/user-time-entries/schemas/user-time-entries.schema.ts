import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserTimeEntryDocument = UserTimeEntry & Document;

export enum TimeEntryType {
  LEAVE = 'LEAVE',
  OVERTIME = 'OVERTIME',
  ATTENDANCE = 'ATTENDANCE',
}

@Schema({ timestamps: true })
export class UserTimeEntry {
  @Prop({ required: true })
  userId: string; // ref tới User._id (hoặc string tùy thiết kế)

  @Prop({ required: true, enum: TimeEntryType })
  type: TimeEntryType;

  @Prop({ required: true })
  startAt: Date;

  @Prop({ required: true })
  endAt: Date;

  @Prop({ required: true })
  refId: string; // id bản ghi gốc từ module Leave, Overtime, Attendance
}

export const UserTimeEntrySchema = SchemaFactory.createForClass(UserTimeEntry);
UserTimeEntrySchema.index({ userId: 1, startAt: 1, endAt: 1 });