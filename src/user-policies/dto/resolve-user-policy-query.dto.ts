import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, Matches } from 'class-validator';
import { UserPolicyType } from '../common/user-policy-type.enum';
import { Types } from 'mongoose';

export class ResolveUserPolicyQueryDto {
  @ApiProperty({ example: '6899c2a19fa487d473cc41f6' })
  @IsMongoId()
  userId!: Types.ObjectId;

  @ApiProperty({ enum: UserPolicyType, example: UserPolicyType.SHIFT_TYPE })
  @IsEnum(UserPolicyType)
  policyType!: UserPolicyType;

  @ApiProperty({ example: '2025-10-01', description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  onDate!: string;
}
