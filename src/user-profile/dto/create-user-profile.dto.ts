import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsDateString, IsEnum } from 'class-validator';
import { Types } from 'mongoose';
import { EDUCATION_LEVELS } from '../common/user-profiles.enum';

export class CreateUserProfileDto {
  @ApiProperty({ description: 'ID của User', type: String })
  @IsNotEmpty()
  userId: Types.ObjectId;

  @ApiProperty({ description: 'Nơi sinh', required: false })
  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @ApiProperty({ description: 'Địa chỉ thường trú', required: false })
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiProperty({ description: 'Địa chỉ tạm trú', required: false })
  @IsOptional()
  @IsString()
  temporaryAddress?: string;

  @ApiProperty({ description: 'CMND/CCCD', required: false })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ description: 'Ngày cấp CMND/CCCD', required: false })
  @IsOptional()
  @IsDateString()
  nationalIdIssuedDate?: Date;

  @ApiProperty({ description: 'Nơi cấp CMND/CCCD', required: false })
  @IsOptional()
  @IsString()
  nationalIdIssuedPlace?: string;

  @ApiProperty({ description: 'Tình trạng hôn nhân', required: false })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiProperty({ description: 'Số tài khoản ngân hàng', required: false })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiProperty({ description: 'Tên ngân hàng', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ description: 'Chi nhánh ngân hàng', required: false })
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiProperty({ description: 'Trình độ học vấn', required: false })
  @IsOptional()
  @IsEnum(EDUCATION_LEVELS)
  educationLevel?: EDUCATION_LEVELS;

  @ApiProperty({ description: 'Chứng chỉ', required: false })
  @IsOptional()
  @IsString()
  certificate?: string;
}
