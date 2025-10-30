import { IsArray, IsBoolean, IsDate, IsMongoId, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Types } from 'mongoose';

export class CreateUserAssignmentDto {
  @IsMongoId()
  userId: Types.ObjectId;

  @IsMongoId()
  organizationId: Types.ObjectId;

  @IsOptional()  
  @ValidateIf(o => o.userCode !== null)  
  @IsString()  
  userCode?: string | null;

  // Đã xoá departmentId

  @IsOptional()
  @IsMongoId()
  positionId?: Types.ObjectId;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  roleIds?: Types.ObjectId[];

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDate()
  timeIn?: Date;

  @IsOptional()
  @IsDate()
  timeOut?: Date;

  @IsOptional()
  @IsString()
  workType?: string; // Loại hình làm việc: fullTime, halftime, remote

  @IsOptional()
  @IsString()
  Details?: string; // Thông tin bổ sung về phân công công việc để dự phòng
} 