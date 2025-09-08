import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true })
  name: string; // Ví dụ: 'admin', 'approver', 'requester'

  @Prop()
  description?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Permission', default: [] })
  permissionIds: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
