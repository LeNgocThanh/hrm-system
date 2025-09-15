import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationStatus, NotificationType } from '../common/notification.enum';

@Schema({ timestamps: true })
export class Notification {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Meeting', index: true, required: true })
  meetingId: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: String, default: '' })
  title: string;

  @Prop({ type: String, default: '' })
  message: string;

  @Prop({ type: Object, default: {} })
  meta: Record<string, any>;

  @Prop({ type: String, enum: NotificationStatus, default: NotificationStatus.UNREAD, index: true })
  status: NotificationStatus;

  @Prop({ type: Date })
  publishAt?: Date

  @Prop({ type: Date })
  expireAt?: Date
}
export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });

