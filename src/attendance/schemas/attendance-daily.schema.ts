import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AttendanceStatus } from '../common/attendance-status.enum';
import {WorkShiftType, SHIFT_CONFIG} from '../common/work-shift-type.enum';
import { HydratedDocument } from 'mongoose';

class DailySessionActual {
  @Prop() checkIn?: Date;
  @Prop() checkOut?: Date;
  @Prop() workedMinutes?: number;
  @Prop() lateMinutes?: number;       // vào trễ so với session.start (+grace)
  @Prop() earlyLeaveMinutes?: number; // ra sớm so với session.end  (-grace)
  @Prop() fulfilled?: boolean;    
  
  // CÁC TRƯỜNG MỚI ĐỂ LƯU THỜI GIAN SỬA THỦ CÔNG
  @Prop() checkIn_Edit?: Date; // Thời gian Check-in thủ công
  @Prop() checkOut_Edit?: Date; // Thời gian Check-out thủ công// đủ điều kiện tính công phiên
}

@Schema({ timestamps: true })
export class AttendanceDaily extends Document {
  @Prop({ required: true }) userId!: string;
  @Prop({ required: true }) dateKey!: string; // 'YYYY-MM-DD' theo tz local
  @Prop({ enum: WorkShiftType, required: true }) shiftType!: WorkShiftType;

  // Tóm tắt
  @Prop() status?: 'ABSENT' | 'HALF_AM' | 'HALF_PM' | 'FULL' | 'PRESENT';
  @Prop() workedMinutes?: number;
  @Prop() lateMinutes?: number;
  @Prop() earlyLeaveMinutes?: number;

  // Theo phiên
  @Prop({ type: DailySessionActual, _id: false }) am?: DailySessionActual;
  @Prop({ type: DailySessionActual, _id: false }) pm?: DailySessionActual;

  // Metadata
  @Prop() editNote?: string;
  @Prop() computedAt?: Date;

  @Prop() isManualEdit?: boolean;
}

export type AttendanceDailyDocument = HydratedDocument<AttendanceDaily>;
export const AttendanceDailySchema = SchemaFactory.createForClass(AttendanceDaily);
AttendanceDailySchema.index({ userId: 1, dateKey: 1 }, { unique: true });



