import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type HolidayDocument = HydratedDocument<Holiday>;


@Schema({ collection: 'holidays', timestamps: true })
export class Holiday {
_id?: string;


@Prop({ required: true })
dateKey: string; // 'YYYY-MM-DD' theo TZ hệ thống (Asia/Bangkok)


@Prop({ required: true })
name: string; // Ví dụ: 'Tết Dương lịch'

@Prop({ default: false })
isMakeUpWork?: boolean; // làm bù

@Prop({ default: true })
isPaid?: boolean; // nghỉ hưởng lương (tùy chính sách)


@Prop()
note?: string;


@Prop()
createdBy?: string;
}


export const HolidaySchema = SchemaFactory.createForClass(Holiday);
// Một ngày chỉ có 1 holiday/orga
HolidaySchema.index({ orgId: 1, dateKey: 1 }, { unique: true });