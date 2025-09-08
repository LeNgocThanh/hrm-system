import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserAccountResponseDto {
  @ApiProperty({ description: 'Account ID' })
  _id: string;

  @ApiProperty({ description: 'User ID this account belongs to' })
  userId: string;

  @ApiProperty({ description: 'Username for login' })
  username: string;

  @ApiProperty({ description: 'Account status', enum: ['active', 'inactive', 'locked', 'suspended'] })
  status: string;

  @ApiPropertyOptional({ description: 'Last login timestamp' })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Number of failed login attempts' })
  loginAttempts: number;

  @ApiPropertyOptional({ description: 'Account locked until this time' })
  lockedUntil?: Date;

  @ApiProperty({ description: 'Whether email is verified' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Whether two-factor authentication is enabled' })
  twoFactorEnabled: boolean;

  @ApiPropertyOptional({ description: 'ID of user who created this account' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'ID of user who last edited this account' })
  editedBy?: string;

  @ApiPropertyOptional({ description: 'Creation time' })
  createTime?: Date;

  @ApiPropertyOptional({ description: 'Last update time' })
  updateTime?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
