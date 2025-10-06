import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AttendanceSummary extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  month: string; // YYYY-MM

  @Prop({ default: 0 })
  totalWorkDays: number;

  @Prop({ default: 0 })
  totalLateDays: number;

  @Prop({ default: 0 })
  totalAbsentDays: number;

  @Prop({ default: 0 })
  totalWorkedMinutes: number;
}

export const AttendanceSummarySchema = SchemaFactory.createForClass(AttendanceSummary);
