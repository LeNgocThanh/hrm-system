import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Action } from '../common/permission.constants';
import { Module } from '../common/module.constants';

export type PermissionDocument = Permission & Document;


@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  module: Module; // VD: 'User', 'Asset', 'All'

  @Prop({ required: true, enum: Action })
  action: Action; // VD: 'create', 'read', 'update', 'delete', 'approve', ...

  @Prop({ required: true, unique: true })
  code: string; // VD: 'users:create', 'approvals:approve'

  @Prop()
  description?: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
