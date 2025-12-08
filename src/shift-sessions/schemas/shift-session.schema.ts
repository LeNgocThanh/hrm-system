// src/attendance/schemas/shift-session.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'shift_sessions' })
export class ShiftSessionNew {
  @Prop({ type: String, required: true, unique: true })
  code!: string; // mã ca: "CA_SANG", "CA_CHIEU", "CA_DEM_1", ...

  @Prop({ type: String, required: true }) 
  start!: string; // 'HH:mm', ví dụ '08:30'

  @Prop({ type: String, required: true }) 
  end!: string;   // 'HH:mm', ví dụ '12:00'

  @Prop({ type: Boolean, default: true })
  required!: boolean; // có tính công phiên này không (mặc định true)

  @Prop()
  graceInMins?: number;   // cho phép vào trễ

  @Prop()
  graceOutMins?: number;  // cho phép ra sớm

  @Prop()
  breakMinutes?: number;  // thời gian nghỉ giữa phiên (nếu có)

  @Prop()
  maxCheckInEarlyMins?: number; // cho phép vào sớm tối đa

  @Prop()
  maxCheckOutLateMins?: number; // cho phép ra trễ tối đa
}

export type ShiftSessionDocument = HydratedDocument<ShiftSessionNew>;
export const ShiftSessionSchema = SchemaFactory.createForClass(ShiftSessionNew);

// index để tìm kiếm nhanh
ShiftSessionSchema.index({ code: 1 }, { unique: true });
