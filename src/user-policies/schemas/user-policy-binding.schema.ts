import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserPolicyType } from '../common/user-policy-type.enum';

@Schema({ collection: 'user_policy_bindings', timestamps: true })
export class UserPolicyBinding {
    // _id mặc định do Mongoose tạo

    /** ID người dùng trong hệ thống của bạn (string cho nhất quán với logs/daily) */
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    /** Loại chính sách (SHIFT_TYPE, PAY_GRADE, ...) */
    @Prop({ type: String, enum: Object.values(UserPolicyType), index: true, required: true })
    policyType!: UserPolicyType;

    /** Mã chính sách tham chiếu sang bảng gốc (vd: REGULAR, PG-DEV2, KPI-OPS-2025Q1) */
    @Prop({ type: String, index: true, required: true })
    policyCode!: string;

    /** Hiệu lực từ (YYYY-MM-DD, inclusive) */
    @Prop({ type: String })
    effectiveFrom?: string;

    /** Hiệu lực đến (YYYY-MM-DD, inclusive) — null = vô thời hạn */
    @Prop({ type: String, default: null })
    effectiveTo?: string | null;

    /** Thông số nhỏ theo từng loại (tuỳ chọn), ví dụ hệ số phụ cấp, ghi chú… */
    @Prop({ type: Object, default: undefined })
    meta?: Record<string, any>;
}

export type UserPolicyBindingDocument = UserPolicyBinding & Document;
export const UserPolicyBindingSchema = SchemaFactory.createForClass(UserPolicyBinding);

/** Truy vấn theo ngày & loại rất nhanh */
UserPolicyBindingSchema.index({ userId: 1, policyType: 1, effectiveFrom: 1, effectiveTo: 1 });

/** Truy vấn nhanh theo mã */
UserPolicyBindingSchema.index({ userId: 1, policyType: 1, policyCode: 1 });
