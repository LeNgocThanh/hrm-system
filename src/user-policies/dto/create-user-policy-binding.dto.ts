import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, IsMongoId } from 'class-validator';
import { UserPolicyType } from '../common/user-policy-type.enum';
import { Types } from 'mongoose';

export class CreateUserPolicyBindingDto {
  @ApiProperty({ example: '6899c2a19fa487d473cc41f6' })
  @IsMongoId()
  userId!: Types.ObjectId;

  @ApiProperty({ enum: UserPolicyType, example: UserPolicyType.SHIFT_TYPE })
  @IsEnum(UserPolicyType)
  policyType!: UserPolicyType;

  @ApiProperty({ example: 'REGULAR', description: 'Mã chính sách (code) ở bảng gốc' })
  @IsString()
  policyCode!: string;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'YYYY-MM-DD (inclusive)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveFrom phải là YYYY-MM-DD' })
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '9999-12-31', description: 'YYYY-MM-DD (inclusive) hoặc null' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveTo phải là YYYY-MM-DD' })
  effectiveTo?: string;

  @ApiPropertyOptional({ description: 'Thông số nhỏ theo từng loại (tuỳ chọn)' })
  @IsOptional()
  meta?: Record<string, any>;
}
