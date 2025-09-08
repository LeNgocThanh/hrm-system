import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MeetingRoomDocument = MeetingRoom & Document;

@Schema({ timestamps: true })
export class MeetingRoom {
  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true, required: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop() location?: string;

  @Prop({ min: 1, default: 4 })
  capacity: number;

  @Prop({ type: [String], default: [] })
  equipment: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  requiresApproval: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  managers: Types.ObjectId[];
}

export const MeetingRoomSchema = SchemaFactory.createForClass(MeetingRoom);

MeetingRoomSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
