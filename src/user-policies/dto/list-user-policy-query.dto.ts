import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString, Matches, isMongoId } from 'class-validator';
import { UserPolicyType } from '../common/user-policy-type.enum';
import { Types } from 'mongoose';

export class ListUserPolicyQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo userId' })
  @IsOptional()
  @IsMongoId()
  userId?: Types.ObjectId;

  @ApiPropertyOptional({ enum: UserPolicyType, description: 'Lọc theo loại chính sách' })
  @IsOptional()
  @IsEnum(UserPolicyType)
  policyType?: UserPolicyType;

  @ApiPropertyOptional({ example: '2025-10-01', description: 'Lọc các binding đang hiệu lực tại ngày này' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  onDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}
