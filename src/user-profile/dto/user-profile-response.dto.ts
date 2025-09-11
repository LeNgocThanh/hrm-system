import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { EDUCATION_LEVELS } from '../common/user-profiles.enum';

export class UserProfileResponseDto {
  @ApiProperty({ description: 'ID của User', type: String })
  userId: Types.ObjectId;

  @ApiProperty({ description: 'Nơi sinh', required: false })
  placeOfBirth?: string;

  @ApiProperty({ description: 'Địa chỉ thường trú', required: false })
  permanentAddress?: string;

  @ApiProperty({ description: 'Địa chỉ tạm trú', required: false })
  temporaryAddress?: string;

  @ApiProperty({ description: 'CMND/CCCD', required: false })
  nationalId?: string;

  @ApiProperty({ description: 'Ngày cấp CMND/CCCD', required: false })
  nationalIdIssuedDate?: Date;

  @ApiProperty({ description: 'Nơi cấp CMND/CCCD', required: false })
  nationalIdIssuedPlace?: string;

  @ApiProperty({ description: 'Tình trạng hôn nhân', required: false })
  maritalStatus?: string;

  @ApiProperty({ description: 'Số tài khoản ngân hàng', required: false })
  bankAccount?: string;

  @ApiProperty({ description: 'Tên ngân hàng', required: false })
  bankName?: string;

  @ApiProperty({ description: 'Chi nhánh ngân hàng', required: false })
  bankBranch?: string;

  @ApiProperty({ description: 'Trình độ học vấn', required: false })
  educationLevel?: EDUCATION_LEVELS;

  @ApiProperty({ description: 'Chứng chỉ', required: false })
  certificate?: string;
}