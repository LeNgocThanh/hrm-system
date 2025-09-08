import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class RoleResponseDto {
  @ApiProperty({ description: 'Unique identifier of the role' })
  _id: string;

  @ApiProperty({ 
    description: 'Name of the role (e.g., admin, approver, requester)',
    example: 'admin'
  })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Description of the role',
    example: 'Administrator with full access'
  })
  description?: string;

  @ApiProperty({ 
    description: 'Array of permission IDs assigned to this role',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
  })
  permissionIds: Types.ObjectId[];

  @ApiProperty({ description: 'Whether the role is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
} 