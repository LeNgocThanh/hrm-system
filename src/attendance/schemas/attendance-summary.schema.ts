import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { HydratedDocument } from 'mongoose';

interface Days {
  days: number;
  presentDays: number;
  fullDays: number;
  halfDaysAM: number;
  halfDaysPM: number;
  absentDays: number;
  leaveDays: number;
}
interface Minutes {
  worked: number;
  late: number;
  earlyLeave: number;
  workHour: number;
  workedCheckIn: number;
}

@Schema({ timestamps: true })
export class AttendanceSummary extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  month: string; // YYYY-MM

  @Prop({ type: Object, default: {} })
  days: Days;

  @Prop({ type: Object, default: {} })
  minutes: Minutes;
}

export type AttendanceSummaryDocument = HydratedDocument<AttendanceSummary>;

export const AttendanceSummarySchema = SchemaFactory.createForClass(AttendanceSummary);
AttendanceSummarySchema.index({ userId: 1, month: 1 }, { unique: true });
