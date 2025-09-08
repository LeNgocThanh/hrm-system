import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Action } from '../common/permission.constants';
import { Module } from '../common/module.constants';
export class PermissionResponseDto {
  @ApiProperty({ description: 'Unique identifier of the permission' })
  _id: string;

  @ApiProperty({ 
    description: 'Name of the permission (e.g., Create User, Read User, Update User, Delete User)',
    example: 'Create User'
  })
  name: string;

  @ApiProperty({ 
    description: 'Module name (e.g., User, Asset, All)',
    example: Module.User,
    enum: Module
  })
  module: Module;

  @ApiProperty({ 
    description: 'Action name (e.g., create, read, update, delete, approve, reject, export)',
    example: Action.CREATE,
    enum: Action
  })
  action: Action;

  @ApiProperty({ 
    description: 'Permission code (e.g., User:create, Asset:read)',
    example: 'User:create'
  })
  code: string;

  @ApiPropertyOptional({ 
    description: 'Description of the permission',
    example: 'Permission to create new users'
  })
  description?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
} 