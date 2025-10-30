import { IsBoolean, IsMongoId, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Types } from 'mongoose';

export class QueryUserAssignmentDto {
  @IsOptional()
  @IsMongoId()
  userId?: Types.ObjectId;

  @IsOptional()
  @ValidateIf(o => o.userCode !== null)
  @IsString()
  userCode?: string | null;

  @IsOptional()
  @IsMongoId()
  organizationId?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  positionId?: Types.ObjectId;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
} 