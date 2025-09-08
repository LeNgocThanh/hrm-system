import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MeetingStatus } from '../common/meeting-status.enum';

export type MeetingDocument = Meeting & Document;

@Schema({ _id: false })
export class Participant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: ['CHAIR', 'REQUIRED', 'OPTIONAL'], default: 'REQUIRED' })
  role: 'CHAIR' | 'REQUIRED' | 'OPTIONAL';

  @Prop({ enum: ['INVITED', 'ACCEPTED', 'DECLINED', 'TENTATIVE'], default: 'INVITED' })
  response: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';

  @Prop() note?: string;
}
export const ParticipantSchema = SchemaFactory.createForClass(Participant);

@Schema({ _id: false })
export class Approval {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  by: Types.ObjectId;

  @Prop({ enum: ['APPROVED', 'REJECTED'], required: true })
  decision: 'APPROVED' | 'REJECTED';

  @Prop({ required: true })
  at: Date;

  @Prop() note?: string;
}
export const ApprovalSchema = SchemaFactory.createForClass(Approval);

@Schema({ _id: false })
export class ExternalGroup {
  @Prop() leaderName?: string;
  @Prop() leaderPhone?: string;
  @Prop() organization?: string;
  @Prop() note?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  headcount: number;
}
export const ExternalGroupSchema = SchemaFactory.createForClass(ExternalGroup);

@Schema({ timestamps: true })
export class Meeting {
  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true, required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  organizerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MeetingRoom', required: true, index: true })
  roomId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop() agenda?: string;

  // Ghi chú hành chính sau này (chỉ edit được sau khi kết thúc)
  @Prop() note?: string;

  @Prop({ required: true, index: true })
  startAt: Date;

  @Prop({ required: true, index: true })
  endAt: Date;

  @Prop({ type: [ParticipantSchema], default: [] })
  participants: Participant[];

  @Prop({ type: [ExternalGroupSchema], default: [] })
  externalGuests: ExternalGroup[];

  @Prop({ type: Number, min: 0, default: 0 })
  externalHeadcount: number;

  @Prop({ enum: Object.values(MeetingStatus), default: MeetingStatus.PENDING_APPROVAL, index: true })
  status: MeetingStatus;

  @Prop({ default: false })
  requiresApproval: boolean;

  @Prop({ type: [ApprovalSchema], default: [] })
  approvals: Approval[];

  @Prop() cancelledAt?: Date;
  @Prop({ type: Types.ObjectId, ref: 'User' }) cancelledBy?: Types.ObjectId;
  @Prop() finishedAt?: Date;
  @Prop() pendingUntil?: Date;
}
export const MeetingSchema = SchemaFactory.createForClass(Meeting);

MeetingSchema.index({ roomId: 1, startAt: 1 });
MeetingSchema.index({ roomId: 1, endAt: 1 });
MeetingSchema.index({ 'participants.userId': 1, startAt: 1, endAt:1, status:1 });
MeetingSchema.index({ organizerId: 1, startAt: 1 });
MeetingSchema.index({ status: 1, startAt: 1 });
MeetingSchema.index({ 'participants.userId': 1, 'participants.response': 1, startAt: 1, status: 1 });
