import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Action } from '../common/permission.constants';
import { Module } from '../common/module.constants';

export class CreatePermissionDto {
  @ApiProperty({ 
    description: 'Name of the permission (e.g., Create User, Read User, Update User, Delete User)',
    example: 'Create User'
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({ 
    description: 'Module name (e.g., users, approvals, assets)',
    example: Module.User,
    enum: Module
  })
  @IsNotEmpty({ message: 'Module is required' })  
  module: Module;

  @ApiProperty({ 
    description: 'Action name (e.g., create, read, update, delete, approve, reject, export)',
    example: Action.CREATE,
    enum: Action
  })
  @IsNotEmpty({ message: 'Action is required' })
  action: Action;

  @ApiProperty({ 
    description: 'Permission code (e.g., users:create, approvals:approve)',
    example: 'User:create'
  })
  @IsNotEmpty({ message: 'Permission code is required' })
  @IsString({ message: 'Permission code must be a string' })
  code: string;

  @ApiPropertyOptional({ 
    description: 'Description of the permission',
    example: 'Permission to create new users'
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
} 