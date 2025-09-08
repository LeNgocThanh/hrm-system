import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateRoleDto {
  @ApiProperty({ 
    description: 'Name of the role (e.g., admin, approver, requester)',
    example: 'admin'
  })
  @IsNotEmpty({ message: 'Role name is required' })
  @IsString({ message: 'Role name must be a string' })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Description of the role',
    example: 'Administrator with full access'
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Array of permission IDs assigned to this role',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
  })
  @IsOptional()
  @IsArray({ message: 'Permission IDs must be an array' })
  @IsMongoId({ each: true, message: 'Each permission ID must be a valid MongoDB ObjectId' })
  permissionIds?: Types.ObjectId[];

  @ApiPropertyOptional({ 
    description: 'Whether the role is active',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'IsActive must be a boolean' })
  isActive?: boolean;
} 