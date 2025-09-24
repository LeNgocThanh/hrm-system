import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OvertimeStatus, OvertimeKind, CompensationType } from '../common/overTime.enum';

@Schema({ _id: false })
export class OvertimeSegment {
  @Prop({ type: Date, required: true })
  startAt!: Date; // cho phép vượt qua nửa đêm

  @Prop({ type: Date, required: true })
  endAt!: Date;

  @Prop({ type: Number })
  hours?: number; // snapshot giờ thực tế (server tính)

  @Prop({ type: String, enum: OvertimeKind })
  kind?: OvertimeKind; // tùy chính sách, có thể auto map theo calendar

  @Prop({ type: String, enum: CompensationType })
  compensationOverride?: CompensationType; // nếu segment muốn khác đơn
}

export type OvertimeRequestDocument = HydratedDocument<OvertimeRequest>;

@Schema({ timestamps: true, collection: 'overtime_requests' })
export class OvertimeRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: CompensationType, required: true })
  compensation!: CompensationType;

  @Prop({ type: [OvertimeSegment], required: true, _id: false })
  segments!: OvertimeSegment[];

  @Prop({ type: Number, default: 0 })
  totalHours!: number;

  @Prop({ type: String, enum: OvertimeStatus, default: OvertimeStatus.Pending })
  status!: OvertimeStatus;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: [Types.ObjectId], ref: 'UploadFile', default: [] })
  attachmentIds?: Types.ObjectId[];

  // duyệt
  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewerId?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: String })
  reviewNote?: string;

  // audit
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const OvertimeRequestSchema = SchemaFactory.createForClass(OvertimeRequest);
