import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { SessionCode } from '../common/session-code.enum';

/** Một phiên làm việc (AM/PM). Chưa hỗ trợ ca gối ngày. */
@Schema({ _id: false })
export class ShiftSession {
  @Prop({ type: String, enum: Object.values(SessionCode), required: true })
  code!: SessionCode;
  @Prop({ type: String, required: true }) // 'HH:mm', ví dụ '08:30'
  start!: string;
  @Prop({ type: String, required: true }) // 'HH:mm', ví dụ '12:00'
  end!: string;
  @Prop({ type: Boolean, default: true })
  required: boolean; // có tính công phiên này không (mặc định true)
  @Prop()
  graceInMins?: number;   // cho phép vào trễ
  @Prop()
  graceOutMins?: number;  // cho phép ra sớm
  @Prop()
  breakMinutes?: number; // thời gian nghỉ giữa phiên (nếu có)
  @Prop()
  maxCheckInEarlyMins?: number; // cho phép vào sớm (ví dụ: 15 phút) để hạn chế chấm công sớm quá
  @Prop ()
  maxCheckOutLateMins?: number;  
}
export const ShiftSessionSchema = SchemaFactory.createForClass(ShiftSession);

/** Luật tuần: 0..6 (CN=0 … T7=6). Mỗi ô là mảng phiên của ngày đó. */
@Schema({ _id: false })
export class WeeklyRules {
  @Prop({ type: [ShiftSessionSchema], default: [] }) ['0']?: ShiftSession[]; // CN
  @Prop({ type: [ShiftSessionSchema], default: [] }) ['1']?: ShiftSession[]; // T2
  @Prop({ type: [ShiftSessionSchema], default: [] }) ['2']?: ShiftSession[];
  @Prop({ type: [ShiftSessionSchema], default: [] }) ['3']?: ShiftSession[];
  @Prop({ type: [ShiftSessionSchema], default: [] }) ['4']?: ShiftSession[];
  @Prop({ type: [ShiftSessionSchema], default: [] }) ['5']?: ShiftSession[];
  @Prop({ type: [ShiftSessionSchema], default: [] }) ['6']?: ShiftSession[]; // T7
}
export const WeeklyRulesSchema = SchemaFactory.createForClass(WeeklyRules);

/** ShiftType cơ bản (chỉ timezone + weeklyRules), chưa có policy/override/version. */
@Schema({ collection: 'shift_types', timestamps: true })
export class ShiftType { 

  @Prop({ type: String, required: true, index: true })
  code!: string;             

  @Prop({ type: String, required: true })
  name!: string;              // ví dụ: 'Ca hành chính 5.5 ngày'

  @Prop({ type: String, default: 'Asia/Bangkok' })
  timezone?: string;

  @Prop({ type: WeeklyRulesSchema, required: true })
  weeklyRules!: WeeklyRules;

  @Prop({ type: Boolean, default: false })
  isCheckTwoTimes?: boolean; // có phải chỉ cần chấm công 2 lần cả ngày
}
export type ShiftTypeDocument = ShiftType & Document;
export const ShiftTypeSchema = SchemaFactory.createForClass(ShiftType);

// Unique trong tổ chức
ShiftTypeSchema.index({ code: 1 }, { unique: true });
