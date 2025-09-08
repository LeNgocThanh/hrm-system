import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PositionDocument = Position & Document;

@Schema({ timestamps: true })
export class Position {
  @Prop({ required: true, unique: true })
  name: string; // Ví dụ: Trưởng phòng, Nhân viên, Giám đốc

  @Prop()
  description?: string;

  @Prop({ default: 1 }) // Thứ tự hoặc cấp bậc (ví dụ: 1 = staff, 3 = manager)
  level: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
