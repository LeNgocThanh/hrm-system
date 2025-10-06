import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AttendanceStatus } from '../common/attendance-status.enum';
import {WorkShiftType, SHIFT_CONFIG} from '../common/work-shift-type.enum';

@Schema({ timestamps: true })
export class AttendanceDaily extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop()
  checkIn?: Date;

  @Prop()
  checkOut?: Date;

  @Prop({ enum: WorkShiftType, default: WorkShiftType.REGULAR })
  shiftType: WorkShiftType;

  @Prop({ default: 0 })
  workedMinutes: number;

  @Prop({ default: 0 })
  lateMinutes: number;

  @Prop({ default: 0 })
  earlyLeaveMinutes: number;

  @Prop({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;
}

export const AttendanceDailySchema = SchemaFactory.createForClass(AttendanceDaily);
