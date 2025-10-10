import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AttendanceLog extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ default: 'system' })
  source: string; // máy chấm công, web, mobile...
}

export type AttendanceLogDocument = AttendanceLog & Document;
export const AttendanceLogSchema = SchemaFactory.createForClass(AttendanceLog);
AttendanceLogSchema.index({ userId: 1, timestamp: 1 });
