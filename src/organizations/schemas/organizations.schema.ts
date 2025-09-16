import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true })
  name: string;

  @Prop({ enum: ['group', 'company', 'division', 'department'], default: 'department' })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', default: null })
  parent: Types.ObjectId | null;

  @Prop({ default: 1 })
  level: number;

  @Prop({ default: '' })
  path: string; // ví dụ: /group_id/company_id/division_id

  @Prop()
  code?: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
// OrganizationSchema.post('findOneAndDelete', async function (doc: any) {
//   if (!doc) return;
//   try {
//     await doc.model('UserAssignment').deleteMany({ organizationId: doc._id });
//   } catch (e) {
//     // log lỗi thay vì nuốt im lặng
//     console.error('[cascade UserAssignment] failed', { orgId: doc._id, error: e });
//     // tùy yêu cầu: có thể throw để rollback nếu đang trong transaction
//   }
// });
