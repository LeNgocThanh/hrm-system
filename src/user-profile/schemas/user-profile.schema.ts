import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

@Schema({ timestamps: true })
export class UserProfile {
 // @Prop()
  //name?: string;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop() placeOfBirth?: string;
  @Prop() permanentAddress?: string;
  @Prop() temporaryAddress?: string;
  @Prop({sparse: true}) nationalId?: string;
  @Prop() nationalIdIssuedDate?: Date;
  @Prop() nationalIdIssuedPlace?: string;
  @Prop() maritalStatus?: string;

  @Prop() bankAccount?: string;
  @Prop() bankName?: string;
  @Prop() bankBranch?: string;
  
}
export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
