import { Schema as NSchema, Prop as NProp, SchemaFactory as NSF } from '@nestjs/mongoose';
import { Types as NTypes, HydratedDocument as NHydrated } from 'mongoose';

export enum AssetDocType {
  PURCHASE = 'PURCHASE',  
  ACCEPTANCE = 'ACCEPTANCE', // tiếp nhận
  HANDOVER = 'HANDOVER', // bàn giao
  TRANSFER = 'TRANSFER',
  REPAIR = 'REPAIR',
  LIQUIDATION = 'LIQUIDATION',
  OTHER = 'OTHER',
}

@NSchema({ timestamps: true, collection: 'asset_documents' })
export class AssetDocument {
// _id: NTypes.ObjectId;

  @NProp({ type: NTypes.ObjectId, ref: 'Asset', required: true, index: true })
  assetId: NTypes.ObjectId;

  @NProp({ type: NTypes.ObjectId, ref: 'User', index: true })
  ownerUserId?: NTypes.ObjectId; // văn bản gắn với người dùng

  @NProp({ enum: AssetDocType, default: AssetDocType.OTHER, index: true })
  type: AssetDocType;

  @NProp({ trim: true })
  title?: string;

  @NProp({ type: NTypes.ObjectId, ref: 'UploadFile', index: true })
  fileId?: NTypes.ObjectId;

  @NProp({ trim: true })
  note?: string;
  
  @NProp({ default: () => new Date(), index: true })
  date: Date; // ngày của tài liệu
}

export type AssetDocumentDocument = NHydrated<AssetDocument>;
export const AssetDocumentSchema = NSF.createForClass(AssetDocument);