import { Schema as MSchema, Prop as MProp, SchemaFactory as MSF, Schema } from '@nestjs/mongoose';
import { HydratedDocument as HDoc, Types as MTypes } from 'mongoose';

export enum AssetEventType {
  PURCHASE = 'PURCHASE', // mua mới
  ASSIGN = 'ASSIGN', // bàn giao cho NV
  TRANSFER = 'TRANSFER', // luân chuyển người dùng/đơn vị
  REPAIR = 'REPAIR', // sửa chữa/bảo hành
  RETURN = 'RETURN', // trả về kho
  LOSS = 'LOSS', // mất
  DISPOSE = 'DISPOSE', // thanh lý/hủy
}

@Schema({ timestamps: true, collection: 'asset_events' })
export class AssetEvent {
//  _id: MTypes.ObjectId;

  @MProp({ type: MTypes.ObjectId, ref: 'Asset', required: true, index: true })
  assetId: MTypes.ObjectId;

  @MProp({ enum: AssetEventType, required: true, index: true })
  type: AssetEventType;

  @MProp({ default: () => new Date(), index: true })
  eventDate: Date; // ngày diễn ra sự kiện

  @MProp({ type: MTypes.ObjectId, ref: 'User', index: true })
  actorId?: MTypes.ObjectId; // người thực hiện (kho, IT, HR…)

  // Thông tin liên quan đến người dùng được gán (nếu có)
  @MProp({ type: MTypes.ObjectId, ref: 'User', index: true })
  toUserId?: MTypes.ObjectId; // người nhận (ASSIGN/TRANSFER)

  @MProp({ type: MTypes.ObjectId, ref: 'User', index: true })
  fromUserId?: MTypes.ObjectId; // người bàn giao (TRANSFER/RETURN)

  @MProp()
  quantity?: number; // mặc định 1; để mở rộng với vật tư

  @MProp({ type: [MTypes.ObjectId], ref: 'AssetDocument', default: [] })
  documents?: MTypes.ObjectId[];

  @MProp({ type: Number })
  cost?: number; // chi phí sửa chữa / thanh lý thu được (nếu cần)

  @MProp({ trim: true })
  note?: string;
}

export type AssetEventDocument = HDoc<AssetEvent>;
export const AssetEventSchema = MSF.createForClass(AssetEvent);
AssetEventSchema.index({ assetId: 1, eventDate: -1 });
