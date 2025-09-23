// schemas/leave-request.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';
import { LeaveType, LeaveUnit } from '../common/leave-type.enum';


export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;

// Subdocument: LeaveSegment
@Schema({ _id: false })
export class LeaveSegment {
  @Prop({ required: true, enum: LeaveUnit })
  unit: LeaveUnit;

  // ---- DAY ----
  @Prop() fromDate?: Date;   // yyyy-mm-ddT00:00Z
  @Prop() toDate?: Date;

  // ---- HALF_DAY ----
  @Prop() date?: Date;
  @Prop({ enum: ['AM', 'PM'] }) slot?: 'AM' | 'PM';

  // ---- HOUR ----
  @Prop() startAt?: Date;    // ISO
  @Prop() endAt?: Date;

  // Tùy chọn: cho phép ghi đè loại phép cho segment này, nếu cần khác với leaveType chung
  @Prop({ enum: LeaveType })
  leaveTypeOverride?: LeaveType;

  // Snapshot số giờ của segment (tính khi duyệt)
  @Prop({ default: 0 })
  hours?: number;
}
export const LeaveSegmentSchema = SchemaFactory.createForClass(LeaveSegment);

@Schema({ timestamps: true })
export class LeaveRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Loại phép mặc định (dùng khi segment không có override)
  @Prop({ enum: LeaveType, required: true })
  leaveType: LeaveType;

  // ✅ Dùng LeaveUnit trong từng segment
  @Prop({ type: [LeaveSegmentSchema], required: true })
  segments: LeaveSegment[];

  @Prop({ default: 0 })
  totalHours?: number; // tổng snapshot giờ của các segment

  @Prop({ default: 'pending' })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @Prop() reason?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'UploadFile' }], default: [] })
  attachmentIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewerId?: Types.ObjectId;

  @Prop() reviewedAt?: Date;
  @Prop() reviewNote?: string;
}
export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);

// Index phục vụ tra cứu
LeaveRequestSchema.index({ userId: 1, status: 1 });
LeaveRequestSchema.index({ 'segments.fromDate': 1 });
LeaveRequestSchema.index({ 'segments.date': 1 });
LeaveRequestSchema.index({ 'segments.startAt': 1 });

// (Tuỳ chọn) validate cơ bản ngay tại schema theo unit
LeaveRequestSchema.pre('validate', function (next) {
  try {
    for (const seg of this.segments ?? []) {
      if (seg.unit === 'DAY') {
        if (!seg.fromDate || !seg.toDate) throw new Error('DAY segment requires fromDate & toDate');
        if (new Date(seg.toDate) < new Date(seg.fromDate)) throw new Error('toDate must be >= fromDate');
      } else if (seg.unit === 'HALF_DAY') {
        if (!seg.date || !seg.slot) throw new Error('HALF_DAY segment requires date & slot');
      } else if (seg.unit === 'HOUR') {
        if (!seg.startAt || !seg.endAt) throw new Error('HOUR segment requires startAt & endAt');
        if (!(new Date(seg.endAt) > new Date(seg.startAt))) throw new Error('endAt must be > startAt');
      }
    }
    next();
  } catch (e) {
    next(e as any);
  }
});
