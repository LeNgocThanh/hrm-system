// src/attendance/schemas/user-shift-session.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'user_shift_sessions' })
export class UserShiftSession {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  userCode!: string; // mã nhân viên để import

  @Prop({ required: true })
  dateKey!: string; // 'YYYY-MM-DD'

  @Prop({ type: [String], default: [] })
  shiftSessionCodes!: string[]; // ví dụ ['CA_SANG', 'CA_CHIEU']
}

export type UserShiftSessionDocument = HydratedDocument<UserShiftSession>;
export const UserShiftSessionSchema =
  SchemaFactory.createForClass(UserShiftSession);

// 1 user / 1 ngày chỉ có 1 bản ghi
UserShiftSessionSchema.index(
  { userId: 1, dateKey: 1 },
  { unique: true },
);

// index phụ để import / tìm nhanh theo userCode
UserShiftSessionSchema.index({ userCode: 1, dateKey: 1 });
