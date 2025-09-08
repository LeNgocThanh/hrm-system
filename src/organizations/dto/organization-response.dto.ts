import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class OrganizationResponseDto {
  @ApiProperty({ description: 'Unique identifier of the organization' })
  _id: string;

  @ApiProperty({ description: 'Name of the organization' })
  name: string;

  @ApiProperty({ 
    description: 'Type of organization',
    enum: ['group', 'company', 'division', 'department']
  })
  type: string;

  @ApiPropertyOptional({ description: 'Parent organization ID' })
  parent?: Types.ObjectId;

  @ApiProperty({ description: 'Level in organization hierarchy' })
  level: number;

  @ApiProperty({ description: 'Path in organization hierarchy' })
  path: string;

  @ApiPropertyOptional({ description: 'Organization code' })
  code?: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  description?: string;

  @ApiProperty({ description: 'Whether the organization is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
} 