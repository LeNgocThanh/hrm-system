import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'Unique identifier of the user' })
  _id: string;

  @ApiProperty({ description: 'Full name of the user' })
  fullName: string;

  @ApiProperty({ description: 'Birthday of the user' })
  birthDay?: Date;

  @ApiProperty({ description: 'Email address of the user' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number of the user' })
  phone?: string;

  @ApiProperty({ description: 'Gender of the user' })
  gender: string;

  @ApiProperty({ description: 'Details of the user' })
  details: string;

  @ApiProperty({ description: 'Hashed password stored in database' })
  password?: string;

  @ApiPropertyOptional({ description: 'Avatar URL of the user' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Employee status of the user' })
  employeeStatus: string;

  @ApiProperty({ 
    description: 'Status of the user',
    enum: ['active', 'inactive', 'terminated']
  })
  status: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
} 