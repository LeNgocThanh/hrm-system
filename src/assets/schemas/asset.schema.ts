import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum AssetStatus {
  IN_STOCK = 'IN_STOCK',
  ASSIGNED = 'ASSIGNED',
  IN_REPAIR = 'IN_REPAIR',
  LOST = 'LOST',
  DISPOSED = 'DISPOSED',
}

export enum AssetType {
  TOOL = 'TOOL',
  EQUIPMENT = 'EQUIPMENT',
  FURNITURE = 'FURNITURE',
  ELECTRONIC = 'ELECTRONIC',
  OTHER = 'OTHER',
}

@Schema({ _id: false })
export class Money {
  @Prop({ required: true, default: 0 })
  amount: number;

  @Prop({ required: true, default: 'VND' })
  currency: string;
}
export const MoneySchema = SchemaFactory.createForClass(Money);

@Schema({ timestamps: true, collection: 'assets' })
export class Asset {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string; // Mã tài sản nội bộ (TS-0001)

  @Prop({ required: true, trim: true })
  name: string; // Tên tài sản

  @Prop({ enum: AssetType, default: AssetType.OTHER })
  type: AssetType;

  @Prop({ trim: true })
  model?: string; // Model/mã hàng

  @Prop({ trim: true })
  serialNumber?: string; // S/N

  @Prop({ type: MoneySchema, _id: false })
  purchasePrice?: Money;

  @Prop()
  purchaseDate?: Date;

  @Prop({ trim: true })
  vendor?: string; // Nhà cung cấp

  @Prop({ trim: true })
  location?: string; // Vị trí/kho

  @Prop({ enum: AssetStatus, default: AssetStatus.IN_STOCK })
  status: AssetStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true, default: null })
  currentHolderId?: Types.ObjectId | null; // người đang được giao

  @Prop({ type: String, trim: true })
  note?: string;

  // metadata bổ sung (tags, cấu hình…)
  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export type AssetDocument = HydratedDocument<Asset>;
export const AssetSchema = SchemaFactory.createForClass(Asset);

AssetSchema.index({ name: 'text', code: 'text', model: 'text', serialNumber: 'text' });
AssetSchema.index({ status: 1, type: 1 });

// Ảo hoá populate nhanh lịch sử gần nhất
AssetSchema.virtual('lastEvent', {
  ref: 'AssetEvent',
  localField: '_id',
  foreignField: 'assetId',
  options: { sort: { eventDate: -1 }, justOne: true },
});